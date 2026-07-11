'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Registers this device for push notifications — but ONLY when running inside
// the native Capacitor app. On the plain website it's a no-op (the dynamic
// imports never resolve because @capacitor/* isn't bundled for web use here).
export default function PushRegistrar() {
  useEffect(() => {
    let cleanup = () => {}
    ;(async () => {
      let Capacitor, PushNotifications
      try {
        ({ Capacitor } = await import('@capacitor/core'))
        if (!Capacitor?.isNativePlatform?.()) return   // website / not native → stop
        ({ PushNotifications } = await import('@capacitor/push-notifications'))
      } catch { return }

      const platform = Capacitor.getPlatform() // 'ios' | 'android'

      const save = async (token) => {
        if (!supabase) return
        const { data } = await supabase.auth.getUser()
        if (!data.user) return                 // only tie a token to a signed-in member
        await supabase.rpc('save_push_token', { tok: token, plat: platform })
      }

      // Ask permission, then register with APNs/FCM.
      const perm = await PushNotifications.checkPermissions()
      let status = perm.receive
      if (status === 'prompt' || status === 'prompt-with-rationale') {
        status = (await PushNotifications.requestPermissions()).receive
      }
      if (status !== 'granted') return
      await PushNotifications.register()

      const h1 = await PushNotifications.addListener('registration', (t) => { save(t.value) })
      const h2 = await PushNotifications.addListener('registrationError', () => {})
      // Tapping a notification opens the relevant page inside the app.
      const h3 = await PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
        const url = a?.notification?.data?.url
        if (url) window.location.assign(url)
      })

      cleanup = () => { h1.remove(); h2.remove(); h3.remove() }
    })()
    return () => cleanup()
  }, [])

  return null
}
