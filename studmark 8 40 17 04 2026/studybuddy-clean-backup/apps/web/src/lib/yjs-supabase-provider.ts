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
  private flushTimer: NodeJS.Timeout | null = null;
  private updateListeners: Array<{ type: string; callback: (...args: any[]) => void }> = [];
  private updateCount = 0;
  private batchSize = 50;

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
    console.log(`🔗 Connecting to canvas room: ${this.roomId}`);
    
    this.channel
      .on('broadcast', { event: UPDATE_EVENT }, ({ payload }) => {
        const encoded = payload?.update;
        if (!encoded) return;
        try {
          const update = decodeUpdate(encoded);
          Y.applyUpdate(this.ydoc, update, ORIGIN_TAG);
        } catch (err) {
          console.error('❌ Failed to decode/apply update:', err);
        }
      })
      .subscribe((status) => {
        console.log(`📡 Channel status: ${status}`);
        this.onStatus?.(status);
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
          this.flushPending();
        }
      });

    const boundHandleUpdate = this.handleUpdate.bind(this);
    this.updateListeners.push({ type: 'update', callback: boundHandleUpdate });
    this.ydoc.on('update', boundHandleUpdate);
  }

  destroy() {
    this.updateListeners.forEach(({ type, callback }) => {
      if (type === 'update') {
        this.ydoc.off('update', callback);
      }
    });
    this.updateListeners = [];
    
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    
    this.pendingUpdates = [];
    supabase.removeChannel(this.channel);
    console.log(`✓ Destroyed provider for room: ${this.roomId}`);
  }

  private handleUpdate(update: Uint8Array, origin: unknown) {
    if (origin === ORIGIN_TAG) return;
    
    this.updateCount++;
    this.pendingUpdates.push(update);
    
    if (!this.isSubscribed) {
      return;
    }
    
    if (this.pendingUpdates.length >= this.batchSize) {
      this.flushPending();
      return;
    }
    
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => this.flushPending(), 16) as unknown as NodeJS.Timeout;
  }

  private flushPending() {
    if (!this.isSubscribed) {
      return;
    }
    if (this.pendingUpdates.length === 0) return;
    
    try {
      const merged = Y.mergeUpdates(this.pendingUpdates);
      this.pendingUpdates = [];
      
      if (this.flushTimer !== null) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      
      const encoded = encodeUpdate(merged);
      const size = encoded.length;
      console.log(`📤 Canvas update sent: ${size} bytes (batch ${this.updateCount})`);
      
      this.channel.send({
        type: 'broadcast',
        event: UPDATE_EVENT,
        payload: { update: encoded },
      }).catch((err) => {
        console.error('❌ Failed to send canvas update:', err);
      });
    } catch (err) {
      console.error('❌ Error flushing canvas updates:', err);
      this.pendingUpdates = [];
    }
  }
}
