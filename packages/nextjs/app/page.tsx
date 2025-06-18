"use client";

import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  const { data: breadBalance } = useScaffoldReadContract({
    contractName: "Bread",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { data: mintEvents } = useScaffoldEventHistory({
    contractName: "Bread",
    eventName: "Mint",
    fromBlock: 0n,
    filters: { user: connectedAddress },
  });

  const { data: burnEvents } = useScaffoldEventHistory({
    contractName: "Bread",
    eventName: "PenaltyBurn",
    fromBlock: 0n,
    filters: { target: connectedAddress },
  });

  // Sort events by block number (most recent first)
  const sortedMintEvents = [...(mintEvents || [])].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
  const sortedBurnEvents = [...(burnEvents || [])].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 w-full max-w-3xl">
          <div className="flex justify-center items-center space-x-2 flex-col mb-8">
            <p className="my-2 text-4xl mb-2 font-bold">🍞 Your Bread Balance 🍞</p>
            <p className="text-4xl font-bold">{breadBalance ? formatEther(breadBalance) : "0"} BRD</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mint Events */}
            <div className="bg-base-300 rounded-3xl px-6 py-4">
              <h2 className="text-xl font-bold mb-4 text-green-500">Mint Events</h2>
              <div className="h-[300px] overflow-y-auto">
                {sortedMintEvents.length === 0 ? (
                  <p className="text-center text-lg">No mint events found</p>
                ) : (
                  <div className="space-y-3">
                    {sortedMintEvents.map((event, index) => (
                      <div key={index} className="bg-base-100 rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-green-500">Minted</span>
                          <span className="text-sm opacity-70">
                            Block #{event.blockNumber?.toString() ?? "Unknown"}
                          </span>
                        </div>
                        <div className="mt-2">
                          <p className="text-lg">{event.args.amount ? formatEther(event.args.amount) : "0"} BRD</p>
                          <p className="text-sm opacity-70">
                            {event.blockNumber
                              ? new Date(Number(event.blockNumber) * 1000).toLocaleString()
                              : "Unknown time"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Burn Events */}
            <div className="bg-base-300 rounded-3xl px-6 py-4">
              <h2 className="text-xl font-bold mb-4 text-red-500">Burn Events</h2>
              <div className="h-[300px] overflow-y-auto">
                {sortedBurnEvents.length === 0 ? (
                  <p className="text-center text-lg">No burn events found</p>
                ) : (
                  <div className="space-y-3">
                    {sortedBurnEvents.map((event, index) => (
                      <div key={index} className="bg-base-100 rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-red-500">Burned</span>
                          <span className="text-sm opacity-70">
                            Block #{event.blockNumber?.toString() ?? "Unknown"}
                          </span>
                        </div>
                        <div className="mt-2">
                          <p className="text-lg">{event.args.amount ? formatEther(event.args.amount) : "0"} BRD</p>
                          <p className="text-sm opacity-70">
                            {event.blockNumber
                              ? new Date(Number(event.blockNumber) * 1000).toLocaleString()
                              : "Unknown time"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
