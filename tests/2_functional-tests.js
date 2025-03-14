const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const mongoose =require('mongoose');
const { Thread, Reply, getThreadId, getReplyId } = require("../model/messageBoard");

chai.use(chaiHttp);

suite('Functional Tests', function () {
  let threadId; // For storing the ID of a created thread
  let replyId; // For storing the ID of a created reply

  // Runs before each test suite to clear the database and set up test data
  beforeEach(async function () {
    await Thread.deleteMany({});
    await Reply.deleteMany({});

    // Create a thread for testing
    const thread = await Thread.create({
      board: "test",
      text: "Test thread",
      delete_password: "password",
      replies: [],
      created_on: new Date(),
      bumped_on: new Date(),
    });

    // Save the thread ID for use in tests
    threadId = thread._id.toString();

    // Add a reply to the thread for testing
    const reply = {
      _id: new mongoose.Types.ObjectId(),
      text: "Test reply",
      delete_password: "reply_password",
      created_on: new Date(),
    };

    thread.replies.push(reply);
    await thread.save();

    // Save the reply ID for use in tests
    replyId = reply._id.toString();
  });

  // Test #1: POST - Create a new thread
  test("#1 POST: Creating a new thread", function (done) {
    chai.request(server)
      .post("/api/threads/test")
      .send({
        text: "New test thread",
        delete_password: "testpassword"
      })
      .end((err, res) => {
        if (err) return done(err);
        assert.equal(res.status, 200);
        assert.isDefined(res.body._id); // Ensure the thread ID is returned
        assert.isArray(res.body.replies); // Ensure replies array exists
        done();
      });
  });

  // Test #2: GET - View the 10 most recent threads with 3 replies each
  test("#2 GET: Viewing the 10 most recent threads with 3 replies each", function (done) {
    chai.request(server)
      .get("/api/threads/test")
      .end((err, res) => {
        if (err) return done(err);
  
        assert.equal(res.status, 200); // Ensure response status is 200
        assert.isArray(res.body); // Ensure the response is an array
        assert.isAtMost(res.body.length, 10); // Ensure max 10 threads
  
        if (res.body.length > 0) {
          const thread = res.body[0];
  
          // Validate thread structure
          assert.isObject(thread);
          assert.isDefined(thread._id);
          assert.isDefined(thread.text);
          assert.isDefined(thread.created_on);
          assert.isDefined(thread.bumped_on);
          assert.isUndefined(thread.replycount);
          assert.isArray(thread.replies);
  
          // Ensure replies array has at most 3 replies
          assert.isAtMost(thread.replies.length, 3);
  
          // Validate the structure of a reply (if any replies exist)
          if (thread.replies.length > 0) {
            const reply = thread.replies[0];
            assert.isDefined(reply._id);
            assert.isDefined(reply.text);
            assert.isDefined(reply.created_on);
          }
        }
        done();
      });
  });
  
  // Test #3: DELETE - Attempt to delete a thread with the wrong password
  test("#3 DELETE: Deleting a thread with the incorrect password", function (done) {
    chai.request(server)
      .delete("/api/threads/test")
      .send({
        thread_id: threadId,
        delete_password: "wrongpassword",
      })
      .end((err, res) => {
        if (err) return done(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, "incorrect password");
        done();
      });
  });

  // Test #4: DELETE - Delete a thread with the correct password
  test("#4 DELETE: Deleting a thread with the correct password", function (done) {
    chai.request(server)
      .delete("/api/threads/test")
      .send({
        thread_id: threadId,
        delete_password: "password",
      })
      .end((err, res) => {
        if (err) return done(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, "success");
        done();
      });
  });

  // Test #5: PUT - Report a thread
  test("#5 PUT: Reporting a thread", function (done) {
    chai.request(server)
      .put("/api/threads/test")
      .send({
        thread_id: threadId,
      })
      .end((err, res) => {
        if (err) return done(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, "reported");
        done();
      });
  });

  // Test #6: POST - Create a new reply to a thread
  test("#6 POST: Creating a new reply", function (done) {
    chai.request(server)
      .post("/api/replies/test")
      .send({
        thread_id: threadId,
        text: "Another test reply",
        delete_password: "replypassword"
      })
      .end((err, res) => {
        if (err) return done(err);
        assert.equal(res.status, 200);
        assert.isDefined(res.body._id);
        assert.isArray(res.body.replies);
        done();
      });
  });

  // Test #7: GET - View a single thread with all its replies
  test("#7 GET: Viewing a single thread with all replies", function (done) {
    chai.request(server)
      .get(`/api/replies/test?thread_id=${threadId}`)
      .end((err, res) => {
        if (err) return done(err);
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.isDefined(res.body.text);
        assert.isDefined(res.body.created_on);
        assert.isDefined(res.body.bumped_on);
        assert.isArray(res.body.replies);
        if (res.body.replies.length > 0) {
          const reply = res.body.replies[0];
          assert.isDefined(reply._id);
          assert.isDefined(reply.text);
          assert.isDefined(reply.created_on);
        }
        done();
      });
  });

  // Test #8: DELETE - Attempt to delete a reply with the wrong password
  test("#8 DELETE: Deleting a reply with the incorrect password", function (done) {
    chai.request(server)
      .delete("/api/replies/test")
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: "wrongpassword",
      })
      .end((err, res) => {
        if (err) return done(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, "incorrect password");
        done();
      });
  });

  // Test #9: DELETE - Delete a reply with the correct password
  test("#9 DELETE: Deleting a reply with the correct password", function (done) {
    chai.request(server)
      .delete("/api/replies/test")
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: "reply_password",
      })
      .end((err, res) => {
        if (err) return done(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, "success");
        done();
      });
  });

  // Test #10: PUT - Report a reply
  test("#10 PUT: Reporting a reply", function (done) {
    chai.request(server)
      .put("/api/replies/test")
      .send({
        thread_id: threadId,
        reply_id: replyId,
      })
      .end((err, res) => {
        if (err) return done(err);
        assert.equal(res.status, 200);
        assert.equal(res.text, "reported");
        done();
      });
  });
});
