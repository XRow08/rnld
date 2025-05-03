"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export const StyledConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
            className="w-full"
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="w-full hover:scale-105 transition-all duration-300 ease-in-out bg-[rgb(247,216,111)] border border-black text-black font-bold py-3 px-4 rounded-lg"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="w-full hover:scale-105 transition-all duration-300 ease-in-out bg-red-500 border border-black text-black font-bold py-3 px-4 rounded-lg"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 w-full">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center justify-center hover:scale-105 transition-all duration-300 ease-in-out bg-[rgb(247,216,111)] border border-black text-black font-bold py-3 px-4 rounded-lg"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: "hidden",
                          marginRight: 6,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center justify-center hover:scale-105 transition-all duration-300 ease-in-out bg-[rgb(247,216,111)] border border-black text-black font-bold py-3 px-4 rounded-lg"
                  >
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ""}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}; 