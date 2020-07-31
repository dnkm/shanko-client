import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import ioclient from "socket.io-client";
import toObject from "form-to-object";

import "./styles.scss";
import Login from "./components/login";
import Rooms from "./components/rooms";
import Room from "./components/room";
import UserContext from "./UserContext";

// const endpoint = `https://18.140.235.74`;
// const endpoint = "https://72u6s.sse.codesandbox.io/";
const endpoint = "localhost:3004";

// phases
// -1 : before login
// 0: logged in
// 1: entered room

function Apps() {
  return (
    <div className="Apps">
      <App defid='daniel' />
      <App defid='daniel2' />
      <App defid='daniel3' />
    </div>
  );
}

function App({defid}) {
  let [io, setIo] = useState(undefined);
  let [phase, setPhase] = useState(-1);
  let [sid, setSid] = useState(undefined);
  let [user, setUser] = useState(undefined);
  let [rooms, setRooms] = useState([]);
  let [room, setRoom] = useState(undefined);
  let [consoleBuffer, setConsoleBuffer] = useState([]);

  //region setup io
  useEffect(() => {
    const io = ioclient(endpoint);
    io.emit2 = (method, payload = {}) => {
      debug(method, payload, true);
      io.emit(method, payload);
    };
    setIo(io);
  }, []);
  //endregion

  //region login
  useEffect(() => {
    if (!io) return;

    io.on("resp_login", (data) => {
      debug("resp_login", data);
      if (data.retcode === 0) {
        setSid(data.sid);
        emit("rqst_userinfo");
        setTimeout(()=>setPhase(0), 500);
      } else {
        alert("wrong password");
      }
    });
    return () => io.off("resp_login");
  }, [io]);
  //endregion

  // when logging in
  useEffect(() => {
    if (!sid) return;

    io.on("resp_userinfo", (data) => {
      debug("resp_userinfo", data);
      setUser(data);
    });

    io.on("resp_rooms", (data) => {
      debug("resp_rooms", data);
      setRooms(data.roomlist);
    });

    io.on("resp_room_enter", (data) => {
      debug("resp_room_enter", data);
      if (data.retcode === 0) {
        setPhase(1);
      }
    });

    io.on("resp_changegender", (data)=>debug("resp_changegender", data))
    io.on("resp_changeimgnumber", (data)=>debug("resp_changeimgnumber", data))

    // io.on("resp_room_leave", data => {
    //   debug("resp_room_leave", data);
    //   debug(phase, data.sid, sid);
    //   if (data.sid === sid) setPhase(0);
    // });

    return () => {
      io.off("resp_userinfo");
      io.off("resp_rooms");
      io.off("resp_room_enter");
      io.off("resp_changegender")
      io.off("resp_changeimgnumber");
      // io.off("resp_room_leave");
    };
  }, [sid]);

  useEffect(() => {
    switch (phase) {
      case 0:
        emit("rqst_rooms");
        return;
      default:
        return;
    }
  }, [phase]);

  function debug(method, payload, goingout = false) {
    setConsoleBuffer((prev) => {
      if (prev.length > 8)
        return prev.slice(1).concat({ method, payload, goingout });
      else return [...prev, { method, payload, goingout }];
    });
  }

  function emit(method, payload = {}) {
    debug(method, payload, true);
    io.emit(method, payload);
  }

  function doLogin(event) {
    event.preventDefault();
    const formData = toObject(event.target);
    emit("rqst_login", formData);
  }

  function roomenter(roomnumber) {
    emit("rqst_room_enter", { roomnumber });
  }

  function changeGender(gender) {
    emit("rqst_changegender", {gender})
    setUser({...user, gender});
  }
  function changeImgnumber(imgnumber) {
    emit("rqst_changeimgnumber", {imgnumber})
    setUser({...user, imgnumber})
  }

  if (!io) return <div>Connecting....</div>;

  return (
    <UserContext.Provider value={{ io, sid, user, setUser }}>
      <div className="App">
        <div className="Main">
          {user && (
            <div className="userinfo" className="userinfo">
              <div>
                Gender: {user.gender}{" "}
                <button onClick={() => changeGender("m")}>M</button>
                <button onClick={() => changeGender("f")}> F</button>
              </div>
              <div>
                Img: {user.imgnumber} 
                <button onClick={()=>changeImgnumber(1)}>1</button>
                <button onClick={()=>changeImgnumber(2)}>2</button>
              </div>
              <div>balance: {user.balance}</div>
              <div>
                win/loss: {user.win}/{user.lose}
              </div>
            </div>
          )}
          {(() => {
            switch (phase) {
              case -1:
                return user ? <></> : <Login defid={defid} doLogin={doLogin} />;
              case 0:
                return <Rooms rooms={rooms} roomenter={roomenter} />;
              case 1:
                return <Room debug={debug} exitRoom={()=>setPhase(0)} />;
              default:
                return <div>...</div>;
            }
          })()}
        </div>
        <div className="my-console">
          <button onClick={()=>setConsoleBuffer([])}>clear</button>
          {consoleBuffer.map((s, i) => (
            <div
              key={i}
              style={{ cursor: "pointer", color: s.goingout ? "green" : "red" }}
              onClick={() => {
                console.log(s.payload);
              }}
            >
              {s.method}
            </div>
          ))}
        </div>
      </div>
    </UserContext.Provider>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<Apps />, rootElement);
