import React, { useContext } from "react";
import UserContext from "../UserContext";

export default function Login({ doLogin, defid }) {
  const { io } = useContext(UserContext);

  return (
    <>
      <h2>Login</h2>
      <div>
        <form onSubmit={doLogin}>
          <input type="text" name="id" defaultValue={defid} required />
          <input type="password" name="password" defaultValue='0000' required />
          <button >
            Login
          </button>
        </form>
      </div>

      <button
        onClick={() => {
          io.emit("server_reset");
        }}
        style={{marginTop: '30px'}}
      >
        RESET SERVER
      </button>
    </>
  );
}
