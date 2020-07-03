import React from "react";

export default function Rooms({ rooms, roomenter }) {
  return (
    <>
      <h2>Rooms (showing first 10)</h2>
      <div>
        {rooms.map((r, i) => (
          <button key={i} onClick={() => roomenter(r.roomnumber)}>
            [{r.roomnumber}]<br />
            {r.status}<br/>
            {r.players} players<br/>
            min bank: ${r.minBank}<br/>
            min balance: ${r.minBalance}
          </button>
        ))}
      </div>
    </>
  );
}
