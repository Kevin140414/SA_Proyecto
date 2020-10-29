'use sctrict'
window.addEventListener('load',()=>{
  var btn = document.getElementById("btnregister")
  btn.addEventListener('click',(e)=>{
    e.preventDefault();
    login();
  })
});


function login() {
    var email = document.getElementsByName("email")[0].value;
    var password = document.getElementsByName("pass")[0].value;

    if(email !== '' && password != ''){
      var rq = {
        method: 'POST',
        redirect: 'follow'
      };

      fetch(ENDPOINT_TOKENS + "/token?id=" + ID_USER + "&secret=" + SECRET_USER, rq)
        .then(response => response.text())
        .then(result => {
          return JSON.parse(result);
        })
        .then(async result => {
          var myHeaders = new Headers();
          myHeaders.append("Authorization", "Bearer " + result.jwt);
          myHeaders.append("Content-Type", "application/json");
         
          var requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
          };

          await fetch(ENDPOINT_USER + "/login?email=" + email + "&password=" + password, requestOptions)
            .then(response => response.text())
            .then(result => {
              var json = JSON.parse(result);
              if(json.id !== undefined) {
                  //alert("Usuario valido");
                  if(json.administrador == 1) window.location.href = 'administrador.html';
                  else window.location.href = 'jugador.html?userid='+json.id;
              }
              else alert(json.message);
            })
            .catch(error => console.log('error', error));
        })
        .catch(error => console.log('error', error));
    }
}