const User = require("./User");
const tweetData = require('data-store')({path: process.cwd() + '/data/tweets.json'});

class Tweet {
    constructor(id, userId, type, body, parentId, mediaType, mediaId)
    {this.id = id;
        this.userId = userId;
        this.type = type;
        this.body = body;
        this.parentId = parentId;
        this.createdAt = new Date();
        this.isDeleted = false;
        this.mediaType = mediaType;
        this.videoId = "";
        this.imageLink = "";
        if (mediaType == "video") {
            if (mediaId.length == 11) {this.videoId = mediaId};
        } else {this.videoId = "";}
        if (mediaType == "image") {
            this.imageLink = mediaId;
        }
        }
    isEdited = false;
    editedAt = null;
    likeCount = 0;
    replyCount = 0;
    retweetCount = 0;
    replyIds = [];
    ;

    edit() {
        this.isEdited = true;
        this.editedAt = new Date();
        tweetData.set(this.id.toString(), this);
    }

    update() {
        tweetData.set(this.id.toString(), this);
    }
}

Tweet.getAllIds = () => {
    // return an array of all tweet IDs
    return Object.keys(tweetData.data).map((id => {return parseInt(id);}));
}

Tweet.getAllIdsForAuthor = (userId) => {
    // returns all tweets with author userId
    return Object.keys(tweetData.data).map((id => {return parseInt(id);})).filter(id => tweetData.get(id).userId == author).map(id => parseInt(id));
}

Tweet.findById = (id) => {
    // returns a tweet with the given id; if no such tweet exists, returns an empty object
    let t = tweetData.get(id.toString());
    if (t != null && t != undefined) {
        return t;
    }
    return {};
}

Tweet.generateView = (tweetId) => {
    // will return empty object if tweet does not exist;
    let t = Tweet.findById(tweetId);
    if (!t.isDeleted) {
        let v = t;
        v.isMine = false;
        v.isLiked = false;
        v.author = {};
        return v;
    } else { return t; }
}

Tweet.nextId = Tweet.getAllIds().reduce((max, nextId) => {
    if (max < nextId) {
        return nextId;
    }
    return max;
}, -1) + 1;

Tweet.create = (userId, type, body, parentId = 'no parent', mediaType = 'none', mediaId = "") => {
    let newId = Tweet.nextId;
    Tweet.nextId += 1;
    let t = new Tweet(newId, userId, type, body, parentId, mediaType, mediaId)
    tweetData.set(t.id.toString(), t);
    return t;
}

Tweet.replyCountIncrement = (id) => {
    let t = tweetData.get(id);
    t.replyCount += 1;
    tweetData.set(id.toString(), t);
}

Tweet.retweetCountIncrement = (id) => {
    let t = tweetData.get(id);
    t.retweetCount += 1;
    tweetData.set(id.toString(), t);
}

Tweet.likeCountIncrement = (id) => {
    let t = tweetData.get(id);
    t.likeCount += 1;
    tweetData.set(id.toString(), t);
}

Tweet.likeCountDecrement = (id) => {
    let t = tweetData.get(id);
    if (t.likeCount != 0) {
        t.likeCount -= 1;
        tweetData.set(id.toString(), t);
    }
}

Tweet.isMine = (userId, tweetId) => {
    // if user posted tweet, returns true; else returns false
    let t = Tweet.findById(tweetId);
    if (t.userId = userId) {
        return true;
    }
    return false;
}

Tweet.isLiked = (userId, tweetId) => {
    // if user liked tweet, returns true; else returns false
    let u = User.findById(userId);
    if (u.likedTweets.includes(tweetId.toString())) {
        return true;
    }
    return false;
}

Tweet.reply  = (replyId, parentId) => {
    let p = Tweet.findById(parentId);
    if (p == {}) {return;}
    p.replyIds.push(replyId);
    tweetData.set(parentId, p);
}

Tweet.delete = (id) => {
    // replaces Tweet object with a version of itself containing only an id field containing its id, an isDeleted field set to true, and a body set to "Tweet deleted."
    tweetData.set(id.toString(), {id: id.toString(), isDeleted: true, body: "Tweet deleted."});
}

module.exports = Tweet;