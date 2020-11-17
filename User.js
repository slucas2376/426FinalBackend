const loginData = require('data-store')({path: process.cwd() + './data/users.json'});

class Tweet {
    constructor(id, displayName)
    {this.id = id;
    this.userId = userId;
    this.type = type;
    this.body = body;
    this.parentId = parentId;
    this.edited = false;
    this.createdAt = new Date();}
    // add other properties, incl default vals; are we adding media links? I don't want to have a cdn so no uploading of our own content
    edited = false;
    editedAt = null;
    likeCount = 0;
    replyCount = 0;
    retweetCount = 0;

    update() {
        this.isUpdated = true;
        this.updatedAt = new Date();
        tweetData.set(this.id.toString(), this);
    }

    delete() {
        tweetData.del(this.id.toString());
    }
}