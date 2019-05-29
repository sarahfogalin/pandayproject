let express = require("express");
let app = express();
let multer = require("multer");
let upload = multer();
let cors = require("cors");
let cookieParser = require("cookie-parser");
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(cookieParser());

let MongoClient = require("mongodb").MongoClient;
let url =
  "mongodb+srv://sarah:final@final-project-lx4vi.mongodb.net/test?retryWrites=true";
let dbs = undefined;
let db = undefined;
MongoClient.connect(url, { useNewUrlParser: true }, (err, allDbs) => {
  if (err) throw err;
  dbs = allDbs;
  db = dbs.db("Panday");
});

let generateId = () => {
  return "" + Math.floor(Math.random() * 10000000);
};

//**************SIGN UP***************** */

app.post("/signup", upload.none(), (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let email = req.body.email;
  db.collection("allusers")
    .findOne({ username: username })
    .then(user => {
      if (user !== null) {
        res.send(JSON.stringify({ success: false }));
        return;
      }
      console.log(req.body.password);
      if (req.body.password.length < 8) {
        res.send(JSON.stringify({ passwordLengthSuccess: false }));
        return;
      }

      db.collection("allusers").insertOne(
        { username: username, password: password, email: email },
        (err, result) => {
          if (err) throw err;
          let sessionId = generateId();
          res.cookie("sid", sessionId);
          db.collection("sessions").insertOne(
            { sessionId: sessionId, username: username },
            (err, result) => {
              if (err) throw err;
            }
          );
          res.send(JSON.stringify({ success: true }));
        }
      );
    });
});

//**************LOG IN***************** */

app.post("/login", upload.none(), (req, res) => {
  let username = req.body.username;
  let givenPassword = req.body.password;
  db.collection("allusers")
    .findOne({ username: username })
    .then(user => {
      if (user === null) {
        res.send(JSON.stringify({ doesUserExist: false }));
        return;
      }
      let expectedPassword = user.password;
      if (givenPassword !== expectedPassword) {
        res.send(JSON.stringify({ success: false }));
        return;
      }
      let sessionId = generateId();
      res.cookie("sid", sessionId);
      console.log(username);
      db.collection("sessions").updateOne(
        { username: username },
        { $set: { sessionId: sessionId } }
      );
      res.send(JSON.stringify({ success: true }));
    });
});

//**************AUTO LOGIN***************** */

app.get("/autoLogin", (req, res) => {
  let sessionId = req.cookies.sid;
  console.log("**sessionId", sessionId);
  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(session => {
      console.log("**session", session);
      if (session !== null) {
        res.send(JSON.stringify({ success: true, username: session.username }));
        return;
      }
      res.send(JSON.stringify({ success: false }));
    });
});

//**************LOG OUT***************** */

app.get("/logout", (req, res) => {
  let sessionId = req.cookies.sid;
  db.collection("sessions").updateOne(
    { sessionId: sessionId },
    {
      $unset: { sessionId: sessionId }
    }
  );
  res.send(JSON.stringify({ success: true }));
});

//**************NEW EVENT***************** */

app.post("/newEvent", upload.none(), (req, res) => {
  //new event for this user
  let username = req.body.username;
  let eventDate = req.body.eventDate;
  let eventTime = req.body.eventTime;
  let eventEndTime = req.body.eventEndTime;
  let eventCategory = req.body.eventCategory;
  let eventTitle = req.body.eventTitle;
  let eventNotes = req.body.eventNotes;
  let eventId = generateId();
  db.collection("allusers")
    .findOne({ username: username })
    .then(user => {
      db.collection("userevents").insertOne(
        {
          username: user.username,
          eventDate: eventDate,
          eventTime: eventTime,
          eventEndTime: eventEndTime,
          eventCategory: eventCategory,
          eventTitle: eventTitle,
          eventNotes: eventNotes,
          eventId: eventId
        },
        (err, result) => {
          if (err) throw err;
        }
      );
      res.send(JSON.stringify({ success: true, eventId: eventId }));
    });
});

//**************GET EVENT DETAILS *************** */

//** the onClick to retrieve the event details will need to append the eventId */

app.post("/eventDetails", upload.none(), (req, res) => {
  let eventId = req.body.eventId;
  db.collection("userevents").findOne({ eventId: eventId }, (err, results) => {
    res.send(JSON.stringify({ success: true, searchResults: results }));
  });
});

//*************GET ALL EVENTS******************** */

app.post("/getUserEvents", upload.none(), (req, res) => {
  let username = req.body.username;
  // console.log("**db: ", db);
  db.collection("userevents")
    .find({ username: username })
    .toArray((err, results) => {
      res.send(JSON.stringify({ success: true, usersEvents: results }));
    });
});

//**************EVENT SEARCH****************** */

app.post("/searchForEvent", upload.none(), (req, res) => {
  let username = req.body.username;
  let searchQuery = req.body.searchQuery;
  let regex = new RegExp(searchQuery, "i");
  db.collection("userevents")
    .find({
      $and: [
        {
          $or: [
            { eventTitle: { $regex: regex } },
            { eventCategory: { $regex: regex } },
            { eventNotes: { $regex: regex } }
          ]
        },
        { username: username }
      ]
    })
    .toArray((err, results) => {
      res.send(JSON.stringify({ success: true, searchResults: results }));
    });
});

//**************CHANGE PASSWORD******************* */

app.post("/changePassword", upload.none(), (req, res) => {
  let email = req.body.email;
  let username = req.body.username;
  let oldPassword = req.body.oldPassword;
  if (req.body.newPassword.length < 8) {
    res.send(JSON.stringify({ lengthSuccess: false }));
    return;
  }
  let newPassword = req.body.newPassword;
  db.collection("allusers")
    .findOne({ username: username })
    .then(user => {
      if (oldPassword !== user.password) {
        res.send(JSON.stringify({ success: false }));
        return;
      }
      db.collection("allusers").replaceOne(
        { username: username },
        { username: username, password: newPassword, email: email }
      );
      res.send(JSON.stringify({ success: true }));
    });
});

//**************CHANGE EMAIL******************* */

app.post("/changeEmail", upload.none(), (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let oldEmail = req.body.oldEmail;
  let newEmail = req.body.newEmail;
  db.collection("allusers")
    .findOne({ username: username })
    .then(user => {
      if (password !== user.password || oldEmail !== user.email) {
        res.send(JSON.stringify({ success: false }));
        return;
      }
      db.collection("allusers").replaceOne(
        { username: username },
        { username: username, password: password, email: newEmail }
      );
      res.send(JSON.stringify({ success: true }));
    });
});

//**************LISTEN 4000***************** */
app.listen(4000, () => {
  console.log("***Running on port 4000");
});
