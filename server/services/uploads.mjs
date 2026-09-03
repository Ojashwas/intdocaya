import crypto from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs'
import { open } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { HttpError } from '../middleware/errors.mjs'

const uploadId = () => `upload-${crypto.randomUUID()}`
const documentId = () => `doc-${crypto.randomUUID()}`

export class UploadService {
  constructor(config, repository) {
    this.config = config
    this.repository = repository
    mkdirSync(config.uploadPath, { recursive: true })
  }

  async create(actor, body, idempotencyKey) {
    if (!idempotencyKey || idempotencyKey.length > 200)
      throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'A valid Idempotency-Key header is required.')
    const existing = await this.repository.getUploadByIdempotency(actor, idempotencyKey)
    if (existing) return existing
    const fileName = basename(String(body.fileName || '')).normalize('NFKC')
    const extension = extname(fileName).slice(1).toLowerCase()
    const mimeType = String(body.mimeType || '').toLowerCase()
    const sizeBytes = Number(body.sizeBytes)
    const hasControlCharacter = [...fileName].some((character) => character.charCodeAt(0) < 32)
    if (!fileName || fileName.length > 240 || /[<>:"/\\|?*]/.test(fileName) || hasControlCharacter)
      throw new HttpError(422, 'INVALID_FILENAME', 'The file name is not allowed.')
    if (!this.config.uploadExtensions.includes(extension))
      throw new HttpError(415, 'EXTENSION_NOT_ALLOWED', 'The file extension is not allowed.')
    if (!this.config.uploadMimeTypes.includes(mimeType))
      throw new HttpError(415, 'MIME_NOT_ALLOWED', 'The file type is not allowed.')
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > this.config.uploadMaxBytes)
      throw new HttpError(
        413,
        'FILE_SIZE_INVALID',
        `The file must be between 1 and ${this.config.uploadMaxBytes} bytes.`,
      )
    const id = uploadId()
    mkdirSync(join(this.config.uploadPath, id), { recursive: true })
    return this.repository.createUpload(actor, {
      id,
      idempotencyKey,
      fileName,
      mimeType,
      sizeBytes,
      chunkSize: Math.min(10 * 1024 * 1024, sizeBytes),
      metadata: body.metadata || {},
    })
  }

  async writeChunk(actor, uploadIdValue, chunkNumber, req) {
    const upload = await this.repository.getUpload(actor, uploadIdValue)
    if (!upload) throw new HttpError(404, 'UPLOAD_NOT_FOUND', 'Upload session not found.')
    if (!['created', 'uploading'].includes(upload.state))
      throw new HttpError(409, 'UPLOAD_STATE_CONFLICT', 'This upload does not accept more chunks.')
    const index = Number(chunkNumber)
    if (!Number.isSafeInteger(index) || index < 0 || index > 10000)
      throw new HttpError(422, 'INVALID_CHUNK', 'The chunk number is invalid.')
    const declared = Number(req.headers['content-length'] || 0)
    if (!declared || declared > upload.chunk_size)
      throw new HttpError(
        413,
        'CHUNK_SIZE_INVALID',
        'The chunk length is missing or exceeds the negotiated size.',
      )
    const path = join(this.config.uploadPath, uploadIdValue, `${String(index).padStart(6, '0')}.part`)
    let received = 0
    req.on('data', (chunk) => {
      received += chunk.length
      if (received > upload.chunk_size)
        req.destroy(new HttpError(413, 'CHUNK_SIZE_INVALID', 'The chunk exceeds the negotiated size.'))
    })
    await pipeline(req, createWriteStream(path, { flags: 'wx' })).catch((error) => {
      if (error.code === 'EEXIST')
        throw new HttpError(409, 'CHUNK_EXISTS', 'This chunk has already been received.')
      throw error
    })
    const total = Math.min(upload.size_bytes, upload.received_bytes + received)
    return this.repository.updateUpload(actor, uploadIdValue, { state: 'uploading', receivedBytes: total })
  }

  async complete(actor, uploadIdValue, metadata = {}) {
    const upload = await this.repository.getUpload(actor, uploadIdValue)
    if (!upload) throw new HttpError(404, 'UPLOAD_NOT_FOUND', 'Upload session not found.')
    if (upload.state === 'completed')
      return { upload, document: await this.repository.getDocument(actor, upload.document_id) }
    if (!['created', 'uploading'].includes(upload.state))
      throw new HttpError(
        409,
        'UPLOAD_STATE_CONFLICT',
        'The upload cannot be completed in its current state.',
      )
    const directory = join(this.config.uploadPath, uploadIdValue)
    const parts = readdirSync(directory)
      .filter((name) => name.endsWith('.part'))
      .sort()
    if (!parts.length) throw new HttpError(409, 'UPLOAD_INCOMPLETE', 'No uploaded chunks were found.')
    const quarantinePath = join(directory, 'quarantine.bin')
    const output = createWriteStream(quarantinePath, { flags: 'wx' })
    const hash = crypto.createHash('sha256')
    let actualBytes = 0
    for (const part of parts) {
      const stream = createReadStream(join(directory, part))
      for await (const chunk of stream) {
        actualBytes += chunk.length
        hash.update(chunk)
        if (!output.write(chunk)) await new Promise((resolve) => output.once('drain', resolve))
      }
    }
    output.end()
    await new Promise((resolve, reject) => {
      output.on('finish', resolve)
      output.on('error', reject)
    })
    if (actualBytes !== upload.size_bytes)
      throw new HttpError(
        409,
        'UPLOAD_INCOMPLETE',
        `Expected ${upload.size_bytes} bytes but received ${actualBytes}.`,
      )
    const contentHash = hash.digest('hex')
    await this.repository.updateUpload(actor, uploadIdValue, {
      state: 'scanning',
      receivedBytes: actualBytes,
      contentHash,
    })
    await this.scan(quarantinePath)
    await this.repository.updateUpload(actor, uploadIdValue, { state: 'clean' })
    const id = documentId()
    const title = String(metadata.title || upload.metadata.title || upload.file_name.replace(/\.[^.]+$/, ''))
      .trim()
      .slice(0, 240)
    if (!title) throw new HttpError(422, 'VALIDATION_ERROR', 'Document title is required.')
    const number = String(
      metadata.number || `DOC-${new Date().getUTCFullYear()}-${id.slice(-8).toUpperCase()}`,
    )
    const objectPath = join(directory, upload.file_name)
    renameSync(quarantinePath, objectPath)
    const document = await this.repository.createDocument(actor, {
      ...upload.metadata,
      ...metadata,
      id,
      title,
      number,
      mimeType: upload.mime_type,
      sizeBytes: actualBytes,
      contentHash,
      sourcePath: objectPath,
    })
    await this.repository.updateUpload(actor, uploadIdValue, { state: 'completed', documentId: document.id })
    // Store only the generated identifier in session metadata would require a migration;
    // returning the idempotent session state is sufficient for local development.
    for (const part of parts) rmSync(join(directory, part))
    return { upload: await this.repository.getUpload(actor, uploadIdValue), document }
  }

  async scan(path) {
    const handle = await open(path, 'r')
    const probe = Buffer.alloc(8192)
    const { bytesRead } = await handle.read(probe, 0, probe.length, 0)
    await handle.close()
    const text = probe.subarray(0, bytesRead).toString('utf8')
    // Safe deterministic development scanner. Production deployment must replace
    // this adapter with the approved malware/DLP service and fail closed.
    if (text.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      throw new HttpError(422, 'MALWARE_DETECTED', 'The upload was rejected by malware scanning.')
    }
    const sensitive = /\b(?:\d[ -]*?){13,19}\b/.test(text)
    if (sensitive)
      throw new HttpError(422, 'DLP_POLICY_VIOLATION', 'The upload contains data blocked by policy.')
  }

  async cancel(actor, id) {
    const upload = await this.repository.getUpload(actor, id)
    if (!upload) throw new HttpError(404, 'UPLOAD_NOT_FOUND', 'Upload session not found.')
    if (upload.state === 'completed')
      throw new HttpError(409, 'UPLOAD_STATE_CONFLICT', 'A completed upload cannot be cancelled.')
    const directory = join(this.config.uploadPath, id)
    if (existsSync(directory)) rmSync(directory, { recursive: true, force: true })
    return this.repository.updateUpload(actor, id, { state: 'cancelled' })
  }
}
