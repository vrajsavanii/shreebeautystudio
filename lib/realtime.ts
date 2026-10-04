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
        if (payload.new && (payload.new as any).data) {
          const currentStore = useSalonStore.getState();
          const newData = (payload.new as any).data as SalonData;
          const currentAppointments = currentStore.data.appointments || [];
          const newAppointments = newData.appointments || [];
          const currentBridal = currentStore.data.bridal || [];
          const newBridal = newData.bridal || [];

          // Check if there is a newly added appointment
          if (newAppointments.length > currentAppointments.length) {
            const added = newAppointments.find(
              (na) => !currentAppointments.some((ca) => ca.id === na.id)
            ) || newAppointments[0];
            if (added && onNewAppointment) {
              onNewAppointment(added);
            }
          } else if (newBridal.length > currentBridal.length) {
            const addedBridal = newBridal.find(
              (nb) => !currentBridal.some((cb) => cb.id === nb.id)
            ) || newBridal[0];
            if (addedBridal && onNewAppointment) {
              const bridalDate = addedBridal.weddingDate || addedBridal.date || addedBridal.sagaiDate || '';
              const bridalTime = addedBridal.weddingTime || addedBridal.sagaiTime || addedBridal.mandapTime || 'TBD';
              onNewAppointment({
                id: addedBridal.id,
                customer: addedBridal.name,
                mobile: addedBridal.mobile,
                service: `👰 Bridal: ${addedBridal.packageName || addedBridal.event || 'Bridal Package'}`,
                date: bridalDate,
                time: bridalTime,
                status: (addedBridal.status as any) || 'Pending',
                price: Number(addedBridal.totalAmount || addedBridal.package || 0),
                source: 'online',
              } as any);
            }
          }

          // Sync into store
          currentStore.setData(newData);
          if ((payload.new as any).updated_at) {
            currentStore.setLastSynced((payload.new as any).updated_at);
          }
          currentStore.setCloudStatus('saved');
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
