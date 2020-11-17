const tweetData = require('data-store')({path: process.cwd() + './data/tweets.json'});

class Tweet {
    constructor(id, userId, type, body, parentId)
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

Tweet.getAllIds = () => {
    // return an array of all tweet IDs
    return Object.keys(tweetData.data).map((id => {return parseInt(id);}));
}

Tweet.getAllIdsForAuthor = (userId) => {
    // returns all tweets with author userId
    return Object.keys(tweetData.data).map((id => {return parseInt(id);})).filter(id => tweetData.get(id).userId == author).map(id => parseInt(id));
}

Tweet.findById = (id) => {
    let t = tweetData.get(id);
    if (t != null) {
        return new Tweet(t.id, t.userId, t.type, t.body, t.parentId);
    }
    return null;
}

Tweet.nextId = Tweet.getAllIds().reduce((max, nextId) => {
    if (max < nextId) {
        return nextId;
    }
    return max;
}, -1) + 1;

Tweet.create = (userId, type, body, parentId = 'no parent') => {
    let newId = Tweet.nextId;
    Tweet.nextId += 1;
    let t = new Tweet(newId, userId, type, body, parentId)
    tweetData.set(t.id.toString(), t);
    return t;
}

// testing create tweet

// let t1 = new Tweet(0, "me", "tweet", "this is the first test tweet!");
// tweetData.set(t1.id.toString(), t1);

module.exports = Tweet;