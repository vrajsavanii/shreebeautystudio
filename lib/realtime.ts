// lib/realtime.ts
import { supabase } from './supabase';
import { useSalonStore } from './store';
import { SalonData, Appointment } from '@/types/salon';
import { RealtimeChannel } from '@supabase/supabase-js';

let realtimeChannel: RealtimeChannel | null = null;

export function initSupabaseRealtime(onNewAppointment?: (appt: Appointment) => void) {
  if (realtimeChannel) {
    return () => {
      supabase.removeChannel(realtimeChannel!);
      realtimeChannel = null;
    };
  }

  const store = useSalonStore.getState();

  realtimeChannel = supabase
    .channel('salon_state_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'salon_state',
      },
      (payload) => {
        console.log('⚡ Supabase Realtime event received:', payload);
        if (payload.new && (payload.new as any).data) {
          const newData = (payload.new as any).data as SalonData;
          const currentAppointments = store.data.appointments || [];
          const newAppointments = newData.appointments || [];

          // Check if there is a newly added appointment
          if (newAppointments.length > currentAppointments.length) {
            const added = newAppointments[0]; // newly added is prepended
            if (added && onNewAppointment) {
              onNewAppointment(added);
            }
          }

          // Sync into store
          store.setData(newData);
          if ((payload.new as any).updated_at) {
            store.setLastSynced((payload.new as any).updated_at);
          }
          store.setCloudStatus('saved');
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Realtime subscription status:', status);
    });

  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };
}
