'use strict';

var expect   = require('chai').expect;
var mongoose = require('mongoose');


mongoose.connect("mongodb+srv://user1:amri1977@freecodecamp.lsrd9.mongodb.net/messageboard2?retryWrites=true&w=majority&appName=freecodecamp", { useNewUrlParser: true});

'use strict';
const { Thread, Reply } = require("../model/messageBoard")


module.exports = function (app) {

  app.route('/api/threads/:board')
  .post(async (req, res) => {
    const { board } = req.params;
    const { text, delete_password } = req.body;

    if (!text || !delete_password) {
      return res.status(400).json({ error: "Missing required fields: text and delete_password" });
    }

    try {
      const thread = await Thread.create({
        board,
        text,
        delete_password,
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false, // Default value
        replies: [], // Default empty array
      });
      res.status(200).json({
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        reported: thread.reported,
        delete_password: thread.delete_password,
        replies: thread.replies,
      });
    } catch (err) {
      console.error("Error creating thread:", err);
      res.status(500).json({ error: "Unable to create thread" });
    }
  })

    .get(async (req, res) => {
      // GET ROUTE
      const { board } = req.params
      let threads = await Thread.find({ board }).sort("-bumped_on").populate("replies")

      threads = threads.map(thread => {
        let threadToView = {
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: thread.replies.sort((a, b) => a.created_on - b.created_on).slice(0, 3).map(reply => {
            let rep = {
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on,
            }
            return rep
          }),
        }
        return threadToView
      }).slice(0, 10)
      res.send(threads)
    })
    .delete(async (req, res) => {
      // DELETE ROUTE
      const { board, thread_id, delete_password } = req.body
      let threadToDelete = await Thread.findById(thread_id)
      if (threadToDelete && threadToDelete.delete_password === delete_password) {
        await Thread.findByIdAndDelete(thread_id).exec()
        res.send("success")
      } else {
        res.send("incorrect password")
      }
    })
    .put(async (req, res) => {
      // PUT ROUTE
      const { board, thread_id } = req.body
      let threadToUpdate = await Thread.findById(thread_id)
      if (threadToUpdate) {
        threadToUpdate.reported = true
        await threadToUpdate.save()
        res.send("reported")
      } else {
        res.send("incorrect thread id")
      }
    });

    app.route('/api/replies/:board')
    .post(async (req, res) => {
      const { text, delete_password, thread_id } = req.body;
  
      if (!text || !delete_password || !thread_id) {
        return res.status(400).json({ error: "Missing required fields: text, delete_password, and thread_id" });
      }
  
      try {
        // Use a single timestamp for both `bumped_on` and `created_on`
        const currentTimestamp = new Date();
  
        // Create a new reply object
        const reply = {
          _id: new mongoose.Types.ObjectId(),
          text,
          delete_password,
          created_on: currentTimestamp,
          reported: false, // Default value
        };
  
        // Find the thread and update it
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.status(404).json({ error: "Thread not found" });
        }
  
        thread.replies.push(reply);
        thread.bumped_on = currentTimestamp; // Use the same timestamp here
        await thread.save();
  
        // Return the updated thread
        res.status(200).json({
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: thread.replies.map(r => ({
            _id: r._id,
            text: r.text,
            created_on: r.created_on,
            reported: r.reported,
          })),
        });
      } catch (err) {
        console.error("Error adding reply:", err);
        res.status(500).json({ error: "Unable to add reply" });
      }
    })
  

    .get(async (req, res) => {
      // GET ROUTE
      const { thread_id } = req.query
      let thread = await Thread.findById(thread_id).populate("replies")

      let threadToView = {
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        replies: thread.replies.map(reply => {
          return {
            _id: reply._id,
            text: reply.text,
            created_on: reply.created_on,
          }
        }),
      }
      res.send(threadToView)
    })
    .delete(async (req, res) => {
      // DELETE ROUTE
      const { thread_id, reply_id, delete_password } = req.body

      let threadTarget = await Thread.findById(thread_id)
      for (let reply of threadTarget.replies) {
        if (reply._id.toString() === reply_id && reply.delete_password === delete_password) {
          reply.text = "[deleted]"
          threadTarget.bumped_on = new Date()
          await threadTarget.save()
          res.send("success")
          return
        }
      }

      res.send("incorrect password")
    })

    .put(async (req, res) => {
      const { thread_id, reply_id, board } = req.body
      const threadTarget = await Thread.findById(thread_id)
      const replyTarget = threadTarget.replies.find(reply => reply._id.toString() === reply_id)

      if (replyTarget) {
        replyTarget.reported = true
        threadTarget.bumped_on = new Date()
        await threadTarget.save()
        res.send("reported")
      } else {
        res.send("incorrect")
      }
    })

};