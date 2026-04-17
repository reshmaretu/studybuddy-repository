import * as Y from 'yjs';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const UPDATE_EVENT = 'yjs-update';
const ORIGIN_TAG = 'supabase';

const encodeUpdate = (update: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < update.length; i++) {
    binary += String.fromCharCode(update[i]);
  }
  return btoa(binary);
};

const decodeUpdate = (encoded: string) => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export class SupabaseYjsProvider {
  private channel: RealtimeChannel;
  private ydoc: Y.Doc;
  private roomId: string;
  private onStatus?: (status: string) => void;
  private isSubscribed = false;
  private pendingUpdates: Uint8Array[] = [];
  private flushTimer: number | null = null;

  constructor(roomId: string, ydoc: Y.Doc, onStatus?: (status: string) => void) {
    this.roomId = roomId;
    this.ydoc = ydoc;
    this.onStatus = onStatus;
    this.channel = supabase.channel(`canvas:${roomId}`, {
      config: {
        broadcast: { self: false },
      },
    });
  }

  connect() {
    this.channel
      .on('broadcast', { event: UPDATE_EVENT }, ({ payload }) => {
        const encoded = payload?.update;
        if (!encoded) return;
        const update = decodeUpdate(encoded);
        Y.applyUpdate(this.ydoc, update, ORIGIN_TAG);
      })
      .subscribe((status) => {
        this.onStatus?.(status);
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
          this.flushPending();
        }
      });

    this.ydoc.on('update', this.handleUpdate);
  }

  destroy() {
    this.ydoc.off('update', this.handleUpdate);
    supabase.removeChannel(this.channel);
  }

  private handleUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === ORIGIN_TAG) return;
    this.pendingUpdates.push(update);
    if (!this.isSubscribed) return;
    if (this.flushTimer !== null) return;
    this.flushTimer = window.setTimeout(() => this.flushPending(), 16);
  };

  private flushPending() {
    if (!this.isSubscribed) return;
    if (this.pendingUpdates.length === 0) return;
    const merged = Y.mergeUpdates(this.pendingUpdates);
    this.pendingUpdates = [];
    if (this.flushTimer !== null) {
      window.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const encoded = encodeUpdate(merged);
    this.channel.send({
      type: 'broadcast',
      event: UPDATE_EVENT,
      payload: { update: encoded },
    });
  }
}
