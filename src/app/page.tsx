"use client";

import { ClaimButton } from "@/components/ClaimButton";
import { FaDiscord, FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Link from "next/link";
import { StyledConnectButton } from "@/components/StyledConnectButton";
import { BSC_CONTRACT } from "@/constants";

const SolanaWalletPage = () => {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-between">
      <header className="fixed top-10 z-10 w-full flex items-center justify-center px-20">
        <div className="flex items-center gap-3 py-3 px-4 md:px-4 justify-between w-full bg-[rgb(250,231,170)] border-2 border-black text-black rounded-xl">
          <div className="font-extrabold">$STAR10</div>

          <div className="hidden md:flex flex-col bg-[rgb(248,232,182)] border border-black rounded-lg overflow-hidden px-1 py-1">
            <div className="px-2 flex items-center">
              <span className="text-[8px] leading-3 text-black font-black">
                TOKEN ADDRESS BSC:
              </span>
              <span className="text-[8px] leading-3 font-black">
                {BSC_CONTRACT}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <Link href={"https://discord.gg/star10token"}>
                <FaDiscord size={20} />
              </Link>
              <Link href={"https://x.com/10Ronaldinho"}>
                <FaXTwitter size={20} />
              </Link>
              <Link href={"https://t.me/star10team"}>
                <FaTelegramPlane size={20} />
              </Link>
            </div>
            <Link
              href={
                "https://pix.gotas.com/#0x8b9abdd229ec0c4a28e01b91aacdc5daafc25c2b?focus=true"
              }
            >
              <button className="hidden md:block hover:scale-105 transition-all duration-300 ease-in-out bg-[rgb(247,216,111)] border border-black text-black font-bold py-2 px-4 rounded-lg text-sm">
                BUY $STAR10 TOKEN
              </button>
            </Link>
          </div>
        </div>
      </header>

      <section className="flex flex-col justify-between pt-40">
        <section className="text-center px-4">
          <h1 className="text-4xl md:text-6xl bg-gradient-to-r from-[rgb(250,231,170)] to-[rgb(247,216,111)] bg-clip-text text-transparent font-bold mb-4">
            STAR10 TOKEN PORTAL
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-300">
            The official token of Ronaldinho Gaúcho.
          </p>
        </section>

        <div className="max-w-md mx-auto pb-20 px-4 mt-8">
          <ClaimButton />
        </div>
      </section>

      <footer className="text-center flex flex-col items-center justify-center text-sm text-gray-400 w-full h-[372px]">
        <div className="py-6 bg-[rgb(247,216,111)] flex flex-col h-full justify-between w-full max-w-[1200px] gap-6">
          <div className="mx-10 flex items-center gap-3 py-8 px-5 h-[60px] md:px-4 justify-between bg-[rgb(250,231,170)] border-2 border-black text-black rounded-xl">
            <div className="font-extrabold text-2xl pl-4">$STAR10</div>

            <div className="flex items-center gap-5">
              <Link href={"#"}>
                <button className="hidden md:block hover:scale-105 transition-all duration-300 ease-in-out bg-[rgb(247,216,111)] border border-black text-black font-bold py-2 px-4 rounded-lg text-sm">
                  Back to top
                </button>
              </Link>
            </div>
          </div>

          <div className="h-[3px] w-full bg-black" />

          <div className="mx-10 font-extrabold flex items-center justify-center h-full">
            <div className="bg-[rgb(250,231,170)] border-2 border-black text-black h-full w-full rounded-lg  flex items-center justify-center">
              <h1 className="text-center lg:text-[180px] md:text-[120px] text-[80px]">
                $STAR10
              </h1>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default SolanaWalletPage;
