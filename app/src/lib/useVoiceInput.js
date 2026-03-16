import { useState, useRef, useCallback } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export function isVoiceSupported() {
    return !!SpeechRecognition
}

export default function useVoiceInput({ onResult, onError } = {}) {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState(null)
    const recognitionRef = useRef(null)

    const startListening = useCallback(() => {
        if (!SpeechRecognition) {
            const msg = 'Voice input is not supported in this browser.'
            setError(msg)
            onError?.(msg)
            return
        }

        // Stop any existing session
        if (recognitionRef.current) {
            try { recognitionRef.current.abort() } catch (_) { /* noop */ }
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onstart = () => {
            setIsListening(true)
            setTranscript('')
            setError(null)
        }

        recognition.onresult = (event) => {
            let interim = ''
            let final = ''
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i]
                if (result.isFinal) {
                    final += result[0].transcript
                } else {
                    interim += result[0].transcript
                }
            }
            setTranscript(final || interim)
        }

        recognition.onend = () => {
            setIsListening(false)
            // Grab the latest transcript via functional ref
            // We use a small delay so the final onresult fires first
            setTimeout(() => {
                const finalTranscript = recognitionRef.current?._lastTranscript
                if (finalTranscript && finalTranscript.trim()) {
                    onResult?.(finalTranscript.trim())
                }
                recognitionRef.current = null
            }, 100)
        }

        recognition.onerror = (event) => {
            // 'no-speech' and 'aborted' are not real errors
            if (event.error === 'no-speech' || event.error === 'aborted') {
                setIsListening(false)
                return
            }
            const msg = `Voice error: ${event.error}`
            setError(msg)
            setIsListening(false)
            onError?.(msg)
        }

        recognitionRef.current = recognition

        try {
            recognition.start()
        } catch (err) {
            console.error('Speech recognition start error:', err)
            setError('Could not start voice input.')
            setIsListening(false)
        }
    }, [onResult, onError])

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            // Save whatever transcript we have before stopping
            recognitionRef.current._lastTranscript = transcript
            try { recognitionRef.current.stop() } catch (_) { /* noop */ }
        }
    }, [transcript])

    // Keep _lastTranscript updated whenever transcript changes
    if (recognitionRef.current) {
        recognitionRef.current._lastTranscript = transcript
    }

    return { isListening, transcript, error, startListening, stopListening }
}
