"use sctrict";
window.addEventListener("load", () => {
  var btn = document.getElementById("btnregister");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    validar();
  });
});

function validar() {
  var nombres = document.getElementsByName("name")[0].value;
  var apellidos = document.getElementsByName("lastname")[0].value;
  var email = document.getElementsByName("email")[0].value;
  var password = document.getElementsByName("pass")[0].value;

  if (nombres !== "" && apellidos !== "" && email !== "" && password != "") {
    var rq = {
      method: "POST",
      redirect: "follow",
    };

    fetch(
      ENDPOINT_TOKENS + "/token?id=" + ID_USER + "&secret=" + SECRET_USER,
      rq
    )
      .then((response) => response.text())
      .then((result) => {
        return JSON.parse(result);
      })
      .then(async (result) => {
        var myHeaders = new Headers();
        myHeaders.append("Authorization", "Bearer " + result.jwt);
        myHeaders.append("Content-Type", "application/json");

        var raw = JSON.stringify({
          nombres: nombres,
          apellidos: apellidos,
          email: email,
          password: password,
          administrador: false,
        });

        var requestOptions = {
          method: "POST",
          headers: myHeaders,
          body: raw,
          redirect: "follow",
        };

        fetch(ENDPOINT_USER + "/jugadores", requestOptions)
          .then((response) => response.text())
          .then((result) => {
            var json = JSON.parse(result);
            if (json.id !== undefined) {
              alert("Usuario registrado correctamente");
              window.location.href = "Login.html";
            } else alert(result);
          })
          .catch((error) => console.log("error", error));
      })
      .catch((error) => console.log("error", error));
  }
}
