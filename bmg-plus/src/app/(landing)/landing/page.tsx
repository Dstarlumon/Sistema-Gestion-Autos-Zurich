'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'

const LoginScene = dynamic(() => import('@/components/three/login-scene'), { ssr: false })

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#222831] relative overflow-hidden">
      <LoginScene />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Image
            src="/images/bmg-plus-logo-white.svg"
            alt="BMG+"
            width={300}
            height={120}
            className="mx-auto mb-6"
          />
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4">
            Plataforma de Gestion{' '}
            <span className="bg-linear-to-r from-[#fa5058] to-[#66cfd0] bg-clip-text text-transparent">
              BPO
            </span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
            Sistema inteligente para la gestion de campanas, leads y agentes.
            Disenado para equipos BPO de alto rendimiento.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/login"
              className="px-8 py-3 bg-linear-to-r from-[#fa5058] to-[#66cfd0] text-white font-bold rounded-xl hover:opacity-90 transition"
            >
              Iniciar Sesion
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 border border-white/20 text-white font-medium rounded-xl hover:bg-white/5 transition"
            >
              Registrarse
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
