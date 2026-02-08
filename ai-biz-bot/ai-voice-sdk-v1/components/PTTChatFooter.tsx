/**
 * PTTChatFooter — Walkie-talkie style chat footer (Gateway Global PTT protocol).
 *
 * Layout (mobile-first):
 * - Bottom 25% of chat: PTT button (hold to talk)
 * - Above that 25%: Transcription strip with editable text, Edit / Delete / + controls
 *
 * Timing:
 * - 1 second to edit transcript before auto-submit
 * - 3 second "callback" window: cancel submission (kill send to LLM/streaming), return to edit
 *
 * Controls: Edit (keyboard edit), Delete (discard draft), + (new message — clear and start fresh).
 * System waits for the last message response before sending the next (single in-flight).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Radio, Pencil, Trash2, Plus, X, Loader2 } from 'lucide-react';

const EDIT_WINDOW_MS = 1000;
const CALLBACK_WINDOW_MS = 3000;

export interface PTTChatFooterProps {
  /** Current draft (transcribed text) */
  draftText: string;
  /** Update draft (e.g. after edit or live transcript) */
  onDraftChange: (text: string) => void;
  /** PTT pressed */
  onPTTDown: () => void;
  /** PTT released */
  onPTTUp: () => void;
  /** Submit draft to LLM (called after 1s or on explicit send) */
  onSubmit: (text: string) => void;
  /** Callback: cancel submission during 3s window (kill send/streaming, stay in edit) */
  onCallback: () => void;
  /** User is holding PTT (recording) */
  isRecording: boolean;
  /** Waiting for AI response (block new submit until done) */
  isWaitingResponse: boolean;
  /** Can submit (e.g. !isWaitingResponse); system waits for last response before next */
  canSubmit?: boolean;
  /** When false, do not auto-submit after 1s (e.g. draft restored from Callback) */
  allowAutoSubmit?: boolean;
  /** Override edit window ms */
  editWindowMs?: number;
  /** Override callback window ms */
  callbackWindowMs?: number;
  /** Optional class for container */
  className?: string;
}

export const PTTChatFooter: React.FC<PTTChatFooterProps> = ({
  draftText,
  onDraftChange,
  onPTTDown,
  onPTTUp,
  onSubmit,
  onCallback,
  isRecording,
  isWaitingResponse,
  canSubmit = true,
  allowAutoSubmit = true,
  editWindowMs = EDIT_WINDOW_MS,
  callbackWindowMs = CALLBACK_WINDOW_MS,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [callbackWindowOpen, setCallbackWindowOpen] = useState(false);
  const editTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const clearTimers = useCallback(() => {
    if (editTimerRef.current) {
      clearTimeout(editTimerRef.current);
      editTimerRef.current = null;
    }
    if (callbackTimerRef.current) {
      clearTimeout(callbackTimerRef.current);
      callbackTimerRef.current = null;
    }
  }, []);

  // When draft appears (e.g. after PTT release), start 1s edit window then auto-submit (unless allowAutoSubmit is false, e.g. restored from Callback)
  useEffect(() => {
    if (!draftText.trim() || isRecording || isWaitingResponse || !canSubmit || !allowAutoSubmit) return;
    clearTimers();
    setSubmitted(false);
    setCallbackWindowOpen(false);

    editTimerRef.current = setTimeout(() => {
      editTimerRef.current = null;
      const text = draftText.trim();
      if (text && canSubmit) {
        onSubmit(text);
        setSubmitted(true);
        setCallbackWindowOpen(true);
        callbackTimerRef.current = setTimeout(() => {
          callbackTimerRef.current = null;
          setCallbackWindowOpen(false);
        }, callbackWindowMs);
      }
    }, editWindowMs);

    return () => clearTimers();
  }, [draftText, isRecording, isWaitingResponse, canSubmit, allowAutoSubmit, editWindowMs, callbackWindowMs, onSubmit, clearTimers]);

  const handleCallback = useCallback(() => {
    if (!callbackWindowOpen) return;
    clearTimers();
    setCallbackWindowOpen(false);
    setSubmitted(false);
    onCallback();
  }, [callbackWindowOpen, onCallback, clearTimers]);

  const handleEdit = useCallback(() => {
    clearTimers();
    setSubmitted(false);
    setCallbackWindowOpen(false);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [clearTimers]);

  const handleDelete = useCallback(() => {
    clearTimers();
    setSubmitted(false);
    setCallbackWindowOpen(false);
    setIsEditing(false);
    onDraftChange('');
  }, [onDraftChange, clearTimers]);

  const handleNewMessage = useCallback(() => {
    clearTimers();
    setSubmitted(false);
    setCallbackWindowOpen(false);
    setIsEditing(false);
    onDraftChange('');
  }, [onDraftChange, clearTimers]);

  const handleSubmitNow = useCallback(() => {
    const text = draftText.trim();
    if (!text || !canSubmit) return;
    clearTimers();
    setSubmitted(true);
    setCallbackWindowOpen(true);
    onSubmit(text);
    callbackTimerRef.current = setTimeout(() => {
      callbackTimerRef.current = null;
      setCallbackWindowOpen(false);
    }, callbackWindowMs);
  }, [draftText, canSubmit, onSubmit, callbackWindowMs, clearTimers]);

  const showTranscriptionStrip = draftText.length > 0 || isEditing;

  return (
    <div
      className={`flex flex-col border-t border-gray-800 bg-gray-950/80 backdrop-blur-sm ${className}`}
      style={{
        minHeight: '50%',
        maxHeight: '50%',
      }}
    >
      {/* Transcription strip — ~25% (half of footer) */}
      <div
        className="flex-shrink-0 flex flex-col justify-center border-b border-gray-800 bg-gray-900/50"
        style={{ minHeight: '50%' }}
      >
        <div className="p-3 flex items-start gap-2">
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={draftText}
              onChange={(e) => onDraftChange(e.target.value)}
              onBlur={() => setIsEditing(false)}
              placeholder="Type or edit your message..."
              className="flex-1 min-h-[60px] max-h-[80px] px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          ) : (
            <div className="flex-1 min-h-[52px] px-3 py-2 rounded-xl bg-gray-800/80 border border-gray-700/80 text-sm text-gray-300 flex items-center">
              {draftText.trim() || (
                <span className="text-gray-500 italic">Transcription will appear here after you speak…</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleEdit}
              disabled={!draftText.trim()}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Edit"
              aria-label="Edit"
            >
              <Pencil size={18} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!draftText.trim()}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 size={18} />
            </button>
            <button
              type="button"
              onClick={handleNewMessage}
              className="p-2 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-gray-800 transition-colors"
              title="New message"
              aria-label="New message"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Callback bar: 3s window to cancel submission */}
        {callbackWindowOpen && submitted && (
          <div className="px-3 pb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              Sent — cancel within 3s to edit
            </span>
            <button
              type="button"
              onClick={handleCallback}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-colors"
            >
              <X size={14} />
              Callback
            </button>
          </div>
        )}

        {/* When not submitted yet, show "Send now" option during edit window */}
        {showTranscriptionStrip && draftText.trim() && !submitted && !isRecording && canSubmit && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={handleSubmitNow}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Send now (or wait 1s to auto-send)
            </button>
          </div>
        )}
      </div>

      {/* PTT button — ~25% (bottom half of footer) */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-4"
        style={{ minHeight: '50%' }}
      >
        <button
          onMouseDown={onPTTDown}
          onMouseUp={onPTTUp}
          onMouseLeave={onPTTUp}
          onTouchStart={(e) => {
            e.preventDefault();
            onPTTDown();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onPTTUp();
          }}
          disabled={isWaitingResponse}
          className={`
            w-full max-w-[280px] py-6 rounded-2xl font-black text-lg flex flex-col items-center gap-3 transition-all transform active:scale-95 select-none border-b-4
            ${isRecording
              ? 'bg-red-600 text-white border-red-800 ring-4 ring-red-500/30'
              : isWaitingResponse
                ? 'bg-gray-700 text-gray-400 border-gray-800 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-800 shadow-lg shadow-emerald-900/20'}
          `}
        >
          {isWaitingResponse ? (
            <Loader2 size={32} className="animate-spin" />
          ) : (
            <Radio size={32} className={isRecording ? 'animate-pulse' : ''} />
          )}
          <span className="uppercase tracking-tight text-sm">
            {isRecording ? 'Recording…' : isWaitingResponse ? 'Waiting for response…' : 'Hold to talk'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default PTTChatFooter;
