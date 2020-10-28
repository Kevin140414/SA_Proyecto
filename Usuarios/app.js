'use strict';
const express = require('express')
const app = express()
const port = 3000
const fs = require('fs');

const jwt = require('jsonwebtoken');

var publicKEY  = fs.readFileSync('./publica.pem', 'utf8');

var token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImV4cCI6MTYwMzMxNjUyMywic2NvcGUiOlsidG9ybmVvLnBhcnRpZGFzIiwidG9ybmVvLmdlbmVyYXIiLCJ0b3JuZW8uc2ltdWxhciJdfQ.iv5O5_L4RZg7805cS2_5TGA2NGGXcMbg5p2DvqJxuitsBhJGB1EKJpTp9wBLdrLNWX8Hen5xsRcupRANN4EpZ5go9_i26M0Y83Rh__cJkNwDs1Yns99Inl2VqJq-I0JM5turPqCsuyL-c7OUu_ixWIbV0yW6kXsSA_VvuGGQspfwkpoZqhblltFO3OkGY6EsYsq4oqCnPD-Lf7QttAAugfxDeWW6qfSzH98_LHlaglWJRxPyvtdqRNmXsTKElFc8GOw5F7nvFziMJ1J4JUGbc53KmV2RED4f98uXaGywSEsrTLqXU_Xa8chp2HfhFCkB0_yxrwd38r4JKaL-72bGEg'
var verifyOptions = {
    algorithm:  ["RS256"]
   };
var legit = jwt.verify(token, publicKEY, verifyOptions);
   
console.log("\nJWT verification result: " + legit);

app.get('/', (req, res) => {
  res.send(legit)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

