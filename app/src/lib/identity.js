// Local, auth-free identity for the Department Communication board.
// Each device stores a self-declared display name plus a stable random device id.
// Acknowledgements/posts are keyed by device id but displayed by name, so renaming
// (e.g. fixing a typo) keeps a device's prior acknowledgements attributed to it.

const NAME_KEY = 'mgmt_author'
const DEVICE_KEY = 'mgmt_device_id'

// Returns the device's stable id, generating and persisting one on first use.
export function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
        // crypto.randomUUID is available in all browsers this app targets; fall back
        // to a timestamp+random id on the off chance it is missing.
        id = (crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        localStorage.setItem(DEVICE_KEY, id)
    }
    return id
}

// Returns the saved display name, or '' if this device has never set one.
export function getAuthorName() {
    return localStorage.getItem(NAME_KEY) || ''
}

// Persists a trimmed display name. Returns the cleaned value actually stored.
export function setAuthorName(name) {
    const clean = (name || '').trim()
    localStorage.setItem(NAME_KEY, clean)
    return clean
}

// True when this device still needs to capture a name before posting/acknowledging.
export function needsName() {
    return getAuthorName().length === 0
}
