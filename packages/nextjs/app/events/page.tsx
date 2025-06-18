"use client";

import { formatEther } from "viem";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const EventsPage = () => {
  const { data: mintEvents, isLoading: isMintLoading } = useScaffoldEventHistory({
    contractName: "Bread",
    eventName: "Mint",
    fromBlock: 0n,
    watch: true,
  });

  const { data: penaltyBurnEvents, isLoading: isPenaltyBurnLoading } = useScaffoldEventHistory({
    contractName: "Bread",
    eventName: "PenaltyBurn",
    fromBlock: 0n,
    watch: true,
  });

  const { data: debugTimeEvents, isLoading: isDebugTimeLoading } = useScaffoldEventHistory({
    contractName: "Bread",
    eventName: "DebugTime",
    fromBlock: 0n,
    watch: true,
  });

  const { data: debugCooldownEvents, isLoading: isDebugCooldownLoading } = useScaffoldEventHistory({
    contractName: "Bread",
    eventName: "DebugCooldown",
    fromBlock: 0n,
    watch: true,
  });

  return (
    <div className="flex flex-col items-center py-10 px-5 sm:px-0 lg:py-20 max-w-[1000px] mx-auto">
      <h1 className="text-4xl font-bold mb-8">Contract Events</h1>

      <div className="w-full mb-12">
        <h2 className="text-2xl font-bold mb-4">Mint Events</h2>
        {isMintLoading ? (
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : mintEvents && mintEvents.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Block Number</th>
                  <th>Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {mintEvents.map((event, index) => {
                  // Debug logging
                  console.log("Mint event:", event);
                  console.log("Event args:", event.args);

                  return (
                    <tr key={index}>
                      <td className="font-mono">
                        {(event.args as any)?.user || (event.args as any)?.[0] || "Unknown"}
                      </td>
                      <td>
                        {(event.args as any)?.amount
                          ? formatEther((event.args as any).amount)
                          : (event.args as any)?.[1]
                            ? formatEther((event.args as any)[1])
                            : "0"}{" "}
                        BRD
                      </td>
                      <td>{event.blockNumber?.toString() ?? "Unknown"}</td>
                      <td className="font-mono">
                        {event.transactionHash ? (
                          <a
                            href={`/blockexplorer/tx/${event.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link link-primary"
                          >
                            {event.transactionHash.slice(0, 8)}...{event.transactionHash.slice(-6)}
                          </a>
                        ) : (
                          "Unknown"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xl">No mint events found</p>
          </div>
        )}
      </div>

      <div className="w-full mb-12">
        <h2 className="text-2xl font-bold mb-4">Penalty Burn Events</h2>
        {isPenaltyBurnLoading ? (
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : penaltyBurnEvents && penaltyBurnEvents.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Amount Burned</th>
                  <th>Block Number</th>
                  <th>Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {penaltyBurnEvents.map((event, index) => (
                  <tr key={index}>
                    <td className="font-mono">
                      {(event.args as any)?.target || (event.args as any)?.[0] || "Unknown"}
                    </td>
                    <td className="text-red-600 font-bold">
                      -
                      {(event.args as any)?.amount
                        ? formatEther((event.args as any).amount)
                        : (event.args as any)?.[1]
                          ? formatEther((event.args as any)[1])
                          : "0"}{" "}
                      BRD
                    </td>
                    <td>{event.blockNumber?.toString() ?? "Unknown"}</td>
                    <td className="font-mono">
                      {event.transactionHash ? (
                        <a
                          href={`/blockexplorer/tx/${event.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary"
                        >
                          {event.transactionHash.slice(0, 8)}...{event.transactionHash.slice(-6)}
                        </a>
                      ) : (
                        "Unknown"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xl">No penalty burn events found</p>
          </div>
        )}
      </div>

      <div className="w-full mb-12">
        <h2 className="text-2xl font-bold mb-4">Debug Cooldown Events</h2>
        {isDebugCooldownLoading ? (
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : debugCooldownEvents && debugCooldownEvents.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Current Time</th>
                  <th>Last Mint Time</th>
                  <th>Time Since Last Mint</th>
                  <th>Remaining Cooldown</th>
                  <th>Block Number</th>
                  <th>Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {debugCooldownEvents.map((event, index) => (
                  <tr key={index}>
                    <td className="font-mono">{event.args?.user || "Unknown"}</td>
                    <td>
                      {event.args?.currentTime
                        ? new Date(Number(event.args.currentTime) * 1000).toLocaleString()
                        : "Unknown"}
                    </td>
                    <td>
                      {event.args?.lastMintTime
                        ? new Date(Number(event.args.lastMintTime) * 1000).toLocaleString()
                        : "Unknown"}
                    </td>
                    <td>
                      {event.args?.timeSinceLastMint ? `${Number(event.args.timeSinceLastMint)} seconds` : "Unknown"}
                    </td>
                    <td>
                      {event.args?.remainingCooldown ? `${Number(event.args.remainingCooldown)} seconds` : "Unknown"}
                    </td>
                    <td>{event.blockNumber?.toString() ?? "Unknown"}</td>
                    <td className="font-mono">
                      {event.transactionHash ? (
                        <a
                          href={`/blockexplorer/tx/${event.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary"
                        >
                          {event.transactionHash.slice(0, 8)}...{event.transactionHash.slice(-6)}
                        </a>
                      ) : (
                        "Unknown"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xl">No debug cooldown events found</p>
          </div>
        )}
      </div>

      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4">Debug Time Events</h2>
        {isDebugTimeLoading ? (
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : debugTimeEvents && debugTimeEvents.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Current Time</th>
                  <th>Last Mint Time</th>
                  <th>Cooldown</th>
                  <th>Block Number</th>
                  <th>Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {debugTimeEvents.map((event, index) => (
                  <tr key={index}>
                    <td className="font-mono">{event.args?.user || "Unknown"}</td>
                    <td>
                      {event.args?.currentTime
                        ? new Date(Number(event.args.currentTime) * 1000).toLocaleString()
                        : "Unknown"}
                    </td>
                    <td>
                      {event.args?.lastMintTime
                        ? new Date(Number(event.args.lastMintTime) * 1000).toLocaleString()
                        : "Unknown"}
                    </td>
                    <td>{event.args?.cooldown ? `${Number(event.args.cooldown)} seconds` : "Unknown"}</td>
                    <td>{event.blockNumber?.toString() ?? "Unknown"}</td>
                    <td className="font-mono">
                      {event.transactionHash ? (
                        <a
                          href={`/blockexplorer/tx/${event.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary"
                        >
                          {event.transactionHash.slice(0, 8)}...{event.transactionHash.slice(-6)}
                        </a>
                      ) : (
                        "Unknown"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xl">No debug time events found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
