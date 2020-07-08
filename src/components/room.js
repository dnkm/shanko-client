import React, { useContext, useEffect, useState } from "react";
import UserContext from "../UserContext";

// TODO: make io context

// sid: 3
// seatIndex: 1
// nickname: "dnkm"
// balance: 100000
// imgnumber: 1
// gender: 0
// isReady: false
// isPlaying: false
// cards: Array[0]
// bet: 0

const PHASES = [
  { phase: "waiting", anims: ["ready"] },
  { phase: "betting", anims: ["bet"] },
  { phase: "deal", anims: ["deal"] },
  { phase: "player phase", anims: ["player action"] },
  { phase: "three card", anims: ["three card"] },
  { phase: "banker phase", anims: ["banker action"] },
  { phase: "results", anims: ["results"] },
];

// betting phase
function PlayerPhase1({ player, isBanker }) {
  const { io } = useContext(UserContext);

  function placeBet(betAmount) {
    io.emit2("sresp_ingame_place_bet", {
      betAmount,
      coins: {
        "10": betAmount / 10,
      },
    });
  }

  if (isBanker) return <div className="box">you are the banker</div>;

  if (player.bet > 0) {
    return <div>[WAITING]</div>;
  }

  return (
    <div className="box">
      {[10, 100, 200].map((v) => (
        <button key={v} onClick={() => placeBet(v)}>
          {v}
        </button>
      ))}
    </div>
  );
}

// waiting phase
function PlayerPhase0() {
  return <>waiting...</>;
}

// player phase
function PlayerPhase3({ isBanker, won }) {
  const { io } = useContext(UserContext);
  let [done, setDone] = useState(false);

  function takeAction(action) {
    io.emit2("sresp_ingame_player_action", { action });
    setDone(true);
  }

  if (done) return <p>Waiting other players....</p>;
  if (won) return <p>won already</p>;
  return (
    <>
      <button onClick={() => takeAction("draw")}>DRAW</button>
      <button onClick={() => takeAction("pass")}>PASS</button>
    </>
  );
}

// 3 card phase
function PlayerPhase4() {
  const { io } = useContext(UserContext);

  function takeAction(threecard) {
    io.emit2("sresp_ingame_three_card", { threecard: threecard });
  }

  return (
    <>
      <button onClick={() => takeAction(true)}>3 Card YES</button>
      <button onClick={() => takeAction(false)}>3 Card NO</button>
    </>
  );
}

// banker phase
function PlayerPhase5() {
  const { io } = useContext(UserContext);

  function takeAction(action) {
    io.emit2("sresp_ingame_banker_action", { action });
  }

  return (
    <>
      <button onClick={() => takeAction("draw")}>DRAW</button>
      <button onClick={() => takeAction("pass")}>PASS</button>
    </>
  );
}

function PlayerPhase6() {
  const { io } = useContext(UserContext);
  let [sent, setSent] = useState(false);

  function finish() {
    io.emit2("sresp_ingame_result");
    setSent(true);
  }

  if (sent) return <div>waiting for other players...</div>;

  return <button onClick={finish}>FINISH</button>;
}

function Player({ player, isBanker, isPlayer, room }) {
  return (
    <div
      className={`player box ${isPlayer ? "p1" : ""} result-${player._result}`}
    >
      <div
        style={{
          color: player._result ? "green" : "red",
          fontWeight: "bold",
        }}
      >
        {player._result}
      </div>
      <div>
        [{player.sid}] {player.nickname}
        {isBanker && <span className="label">BANKER</span>}
      </div>
      <div>${player.balance}</div>
      <div>BET: ${player.bet}</div>
      {room.phaseIndex === 0 && (
        <PlayerPhase0 player={player} isPlayer={isPlayer} isBanker={isBanker} />
      )}
      {room.phaseIndex === 1 && player.isActive && isPlayer && !isBanker && (
        <PlayerPhase1 player={player} />
      )}
      {room.phaseIndex === 3 && player.isActive && isPlayer && !isBanker && (
        <PlayerPhase3
          player={player}
          won={room.winners.indexOf(player.sid) >= 0}
        />
      )}
      {room.phaseIndex === 4 && player.isActive && isPlayer && isBanker && (
        <PlayerPhase4 />
      )}
      {room.phaseIndex === 5 && player.isActive && isPlayer && isBanker && (
        <PlayerPhase5 />
      )}
      {room.phaseIndex === 6 && player.isActive && isPlayer && <PlayerPhase6 />}

      <div
        style={{
          display: "flex",
          justifyContent: "space-evenly",
        }}
      >
        {player.cards.map((card, i) => (
          <div
            key={i}
            className="card box"
            style={{
              color:
                card.img === "DIAMONDS" || card.img === "HEARTS"
                  ? "red"
                  : "black",
            }}
          >
            {(() => {
              switch (card.img) {
                case "DIAMONDS":
                  return "♦️";
                case "HEARTS":
                  return "♥️";
                case "SPADES":
                  return "♠️";
                case "CLUBS":
                  return "♣️";
                default:
                  return "🃏";
              }
            })()}
            {card.num}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Room({ debug, exitRoom }) {
  let [room, setRoom] = useState(undefined);
  let [leaving, setLeaving] = useState(false);
  const { io, sid, user, setUser } = useContext(UserContext);

  const sitted =
    typeof room !== "undefined" &&
    room.players.findIndex((p) => p && p.sid === user.id) >= 0;

  useEffect(() => {
    io.emit2("rqst_ingame_state");

    io.on("resp_ingame_imready", (data) => {
      debug("resp_ingame_imready");
    });

    io.on("resp_ingame_state", (data) => {
      debug("resp_ingame_state", data);

      setRoom((room) => {
        if (!room) io.emit2("rqst_ingame_imready");
        return { ...room, ...data };
      });
    });

    io.on("resp_ingame_sit", (data) => {
      debug("resp_ingame_sit", data);
      setRoom((room) => ({ ...room, ...data }));
    });

    io.on("srqst_ingame_newuser", (data) => {
      debug("srqst_ingame_newuser", data);
      io.emit2("rqst_ingame_state"); // TODO needs piggyback
    });

    io.on("srqst_ingame_place_bet", (data) => {
      debug("srqst_ingame_place_bet", data);
      setRoom((room) => ({ ...room, ...data }));
    });

    io.on("srqst_ingame_deal", (data) => {
      debug("srqst_ingame_deal", data);
      io.emit2("sresp_ingame_deal");
      setRoom((room) => ({ ...room, ...data }));
    });

    io.on("srqst_ingame_player_action", (data) => {
      
      debug("srqst_ingame_player_action", data);
      setRoom((room) => ({ ...room, ...data }));
    });

    io.on("srqst_ingame_player_action_update", (data) => {
      debug("srqst_ingame_player_action_update", data);
      setRoom((room) => ({ ...room, ...data }));

      io.emit2("sresp_ingame_player_action_update");
    });

    io.on("srqst_ingame_three_card", (data) => {
      debug("srqst_ingame_three_card", data);
      setRoom((room) => ({ ...room, ...data }));
    });

    io.on("srqst_ingame_three_cards", (data) => {
      debug("srqst_ingame_three_cards", data);
      setRoom((room) => ({ ...room, ...data }));
      io.emit2("sresp_ingame_three_cards");
    });

    io.on("srqst_ingame_banker_action", (data) => {
      debug("srqst_ingame_banker_action", data);
      setRoom((room) => ({ ...room, ...data }));
    });

    io.on("srqst_ingame_banker_action_update", (data) => {
      debug("srqst_ingame_banker_action_update", data);
      setRoom((room) => ({ ...room, ...data }));
    });

    io.on("srqst_ingame_result", (data) => {
      debug("srqst_ingame_result", data);
      setRoom((room) => ({ ...room, ...data }));
    });

    io.on("resp_ingame_standup", (data) => {
      debug("resp_ingame_standup", data);
    });

    io.on("srqst_ingame_standup", (data) => {
      debug("srqst_ingame_standup", data);
      setRoom((room) => ({ ...room, ...data }));
    });

    io.on("srqst_ingame_gamestart", (data) => {
      debug("srqst_ingame_gamestart", data);
      setRoom((room) => ({ ...room, ...data }));
    });
    
    io.on("srqst_ingame_leave", (data) => {
      debug("srqst_ingame_leave", data);
      if (data.sid === sid) exitRoom();
      else io.emit2("rqst_ingame_state");
    });

    io.on("resp_ingame_leave", (data) => debug("resp_ingame_leave", data));
    io.on("resp_ingame_leavecancel", (data) =>
      debug("resp_ingame_leavecancel", data)
    );

    return function cleanUp() {
      io.off("resp_ingame_imready");
      io.off("resp_ingame_sit");
      io.off("srqst_ingame_newuser");
      io.off("resp_ingame_state");
      io.off("srqst_ingame_place_bet");
      io.off("srqst_ingame_deal");
      io.off("srqst_ingame_player_action");
      io.off("srqst_ingame_player_action_update");
      io.off("srqst_ingame_three_card");
      io.off("srqst_ingame_three_cards");
      io.off("srqst_ingame_banker_action");
      io.off("srqst_ingame_banker_action_update");
      io.off("resp_ingame_standup");
      io.off("srqst_ingame_standup");
      io.off("srqst_ingame_gamestart");
      io.off("srqst_ingame_result");
      io.off("resp_ingame_leave");
      io.off("resp_ingame_leavecancel");
      io.off("srqst_ingame_leave");
    };
  }, []);

  useEffect(() => {
    if (!room) return;
    // extract user
    room.players.filter((p) => p && p.sid === sid).forEach(setUser);
  }, [room]);

  function sit(seatIndex) {
    io.emit2("rqst_ingame_sit", { seatIndex });
  }

  function leave() {
    io.emit2("rqst_ingame_leave");
    setLeaving(true);
  }

  function leaveCancel() {
    io.emit2("rqst_ingame_leavecancel");
    setLeaving(false);
  }

  function checkState() {
    io.emit2("rqst_ingame_state");
  }

  if (!room) return <div>loading....</div>;

  return (
    <div className="room">
      <table className="table1">
        <thead>
          <tr>
            <th>Room #</th>
            <th>Min. Bank</th>
            <th>Bank</th>
            <th>Warning</th>
            <th>action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{room.roomnumber}</td>
            <td>{room.minimumbank}</td>
            <td>{room.bank}</td>
            <td>{room.warning}</td>
            <td>
              {leaving ? (
                <button onClick={() => leaveCancel()}>Leave Cancel</button>
              ) : (
                <button onClick={() => leave()}>Leave</button>
              )}
              <button onClick={checkState}>Status</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="phases">
        {PHASES.map((p, i) => (
          <div key={i} className={room.phaseIndex === i ? "active" : ""}>
            ({i}) {p.phase}
          </div>
        ))}
      </div>
      <div className="players">
        {room.players
          .filter((_, i) => i < 3)
          .map((p, i) => {
            if (p == null)
              return (
                <div key={i} className="player box">
                  <div>Empty</div>
                  {!sitted && <button onClick={() => sit(i)}>Sit</button>}
                </div>
              );
            else
              return (
                <Player
                  key={i}
                  player={p}
                  isBanker={room.bankerIndex === p.sid}
                  isPlayer={p.sid === sid}
                  room={room}
                />
              );
          })}
      </div>
    </div>
  );
}
