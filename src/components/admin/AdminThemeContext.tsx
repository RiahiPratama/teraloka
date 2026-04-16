'use client'
import { createContext, useContext } from 'react'

export type AdminTheme = {
  bg: string
  sidebar: string
  sidebarBorder: string
  navActive: string
  navHover: string
  textPrimary: string
  textMuted: string
  textDim: string
  accent: string
  accentDim: string
  topbar: string
  topbarBorder: string
  mainBg: string
  userCard: string
  // ── Extended — dipakai di financial & ads pages ──
  card: string       // background kartu utama
  cardBorder: string // border kartu
  cardInner: string  // elemen dalam kartu (progress bar track, dll)
  inputBg: string    // background input/select
  inputBorder: string// border input/select
  codeText: string   // accent green text (4ADE80 dark / 1B6B4A light)
  deepBg: string     // bg gelap paling dalam (0D1117 / F3F4F6)
}

type AdminThemeContextType = {
  dark: boolean
  t: AdminTheme
}

export const DARK_THEME: AdminTheme = {
  bg: '#0D1117',
  sidebar: '#0D1117',
  sidebarBorder: '#1F2937',
  navActive: 'rgba(27,107,74,0.15)',
  navHover: 'rgba(27,107,74,0.1)',
  textPrimary: '#F9FAFB',
  textMuted: '#9CA3AF',
  textDim: '#4B5563',
  accent: '#4ADE80',
  accentDim: '#1B6B4A',
  topbar: '#111827',
  topbarBorder: '#1F2937',
  mainBg: '#0A0F1A',
  userCard: '#111827',
  card: '#111827',
  cardBorder: '#1F2937',
  cardInner: '#1F2937',
  inputBg: '#1F2937',
  inputBorder: '#374151',
  codeText: '#4ADE80',
  deepBg: '#0D1117',
}

export const LIGHT_THEME: AdminTheme = {
  bg: '#F3F4F6',
  sidebar: '#FFFFFF',
  sidebarBorder: '#E5E7EB',
  navActive: 'rgba(0,53,38,0.08)',
  navHover: 'rgba(0,53,38,0.06)',
  textPrimary: '#111827',
  textMuted: '#6B7280',
  textDim: '#9CA3AF',
  accent: '#003526',
  accentDim: '#1B6B4A',
  topbar: '#FFFFFF',
  topbarBorder: '#E5E7EB',
  mainBg: '#F3F4F6',
  userCard: '#F9FAFB',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  cardInner: '#E5E7EB',
  inputBg: '#F9FAFB',
  inputBorder: '#D1D5DB',
  codeText: '#1B6B4A',
  deepBg: '#F3F4F6',
}

export const AdminThemeContext = createContext<AdminThemeContextType>({
  dark: true,
  t: DARK_THEME,
})

export const useAdminTheme = () => useContext(AdminThemeContext)
