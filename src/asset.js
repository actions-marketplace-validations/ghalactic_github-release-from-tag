import {readFile} from 'fs/promises'
import {lookup} from 'mime-types'
import {basename} from 'path'

export async function modifyReleaseAssets ({
  config,
  error,
  group,
  info,
  owner,
  release,
  repo,
  repos,
  request,
}) {
  const existingAssets = release.assets
  const desiredAssets = config.assets.map(normalizeAsset)

  if (existingAssets.length < 1 && desiredAssets.length < 1) {
    info('No release assets to modify')

    return true
  }

  return group('Modifying release assets', async () => {
    const {toUpload, toUpdate} = diffAssets(existingAssets, desiredAssets)

    info(`${toUpload.length} to upload, ${toUpdate.length} to update`)

    const [
      uploadResults,
      updateResults,
    ] = await Promise.all([
      Promise.allSettled(toUpload.map(desired => uploadAsset(desired))),
      Promise.allSettled(toUpdate.map(([existing, desired]) => updateAsset(existing, desired))),
    ])

    const uploadResult = analyzeResults(uploadResults)
    const updateResult = analyzeResults(updateResults)

    logResults(info, error, uploadResult, '{successCount} uploaded, {failureCount} failed to upload')
    logResults(info, error, updateResult, '{successCount} updated, {failureCount} failed to update')

    return (
      uploadResult.isSuccess &&
      updateResult.isSuccess
    )
  })

  async function deleteAsset (existing) {
    info(`Deleting existing release asset ${JSON.stringify(existing.name)} (${existing.id})`)

    await repos.deleteReleaseAsset({
      owner,
      repo,
      asset_id: existing.id,
    })
  }

  async function updateAsset (existing, desired) {
    await deleteAsset(existing)
    await uploadAsset(desired)
  }

  async function uploadAsset (desired) {
    const {upload_url: url} = release
    const {name, path} = desired
    const contentType = lookup(path)
    const data = await readFile(path)

    info(`Uploading release asset ${JSON.stringify(desired.name)} (${contentType})`)

    await request({
      method: 'POST',
      url,
      name,
      data,
      headers: {
        'Content-Type': contentType,
      },
    })
  }
}

function normalizeAsset (asset) {
  const {path} = asset

  return {
    name: basename(path),
    path,
  }
}

function diffAssets (existingAssets, desiredAssets) {
  const toUpdate = []
  const toUpload = []

  for (const desired of desiredAssets) {
    const existing = existingAssets.find(existing => existing.name === desired.name)

    if (existing == null) {
      toUpload.push(desired)
    } else {
      toUpdate.push([existing, desired])
    }
  }

  return {
    toUpdate,
    toUpload,
  }
}

function analyzeResults (results) {
  let isSuccess = true
  let successCount = 0
  let failureCount = 0
  const failureReasons = []

  for (const {status, reason} of results) {
    if (status === 'fulfilled') {
      ++successCount
    } else {
      isSuccess = false
      ++failureCount
      failureReasons.push(reason)
    }
  }

  return {
    isSuccess,
    successCount,
    failureCount,
    failureReasons,
  }
}

async function logResults (info, error, result, messageTemplate) {
  const {successCount, failureCount, failureReasons} = result
  const message = messageTemplate
    .replace('{successCount}', successCount)
    .replace('{failureCount}', failureCount)

  if (failureCount > 0) {
    info(`${message}:`)
    for (const reason of failureReasons) error(reason.stack)
    info('')
  } else {
    info(message)
  }
}
