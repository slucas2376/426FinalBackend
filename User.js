const userData = require('data-store')({path: process.cwd() + '/data/users.json'});

class User {
    constructor(id, displayName, password, avatar, profileDescription, type = "user")
    {this.id = id;
    this.displayName = displayName;
    this.password = password;
    this.avatar = avatar;
    this.profileDescription = profileDescription;
    this.type = type;
    this.likedTweets = [];
    this.postedTweets = [];
    };
}

User.create = (id, displayName, password, avatar = "[default link]", profileDescription = "Your description goes here.") => {
    let u = new User(id, displayName, password, avatar, profileDescription);
    userData.set(u.id.toString(), u);
    return u;
}

User.createAdmin = (id, displayName, password, avatar = "[default link]", profileDescription = "Your description goes here.") => {
    let u = new User(id, displayName, password, avatar, profileDescription, "admin");
    u.type = "admin";
    userData.set(u.id.toString(), u);
    return u;
}

User.update = (id, displayName, password, avatar, profileDescription) => {
    let old = User.findById(id);
    if (old == {}) {return;}
    let oldLikes = old.likedTweets;
    if (old.type == "admin") {
        let a = new User(id, displayName, password, avatar, profileDescription, "admin")
        a.likedTweets = oldLikes;
        userData.set(id, a);
    } else {
        let u = new User(id, displayName, password, avatar, profileDescription)
        u.likedTweets = oldLikes;
        userData.set(id, u);
    };
}

User.makeView = (userObj) => {
    // generates a UserView object, which is just a User object without the password field
    let viewId = userObj.id;
    let viewDisplayName = userObj.displayName;
    let viewAvatar = userObj.avatar;
    let viewDescription = userObj.profileDescription;
    let viewType = userObj.type;
    return {id: viewId, displayName: viewDisplayName, avatar: viewAvatar, profileDescription: viewDescription, type: viewType}
}

User.findById = (id) => {
    // returns user object for given id; if id is undefined, returns empty object;
    if (id == undefined || id == null) {
        return {};
    }
    let u = userData.data[id];
    if (u == undefined || u == null) {
        return {};
    }
    return u;
}

User.getAll = () => {
    // return a JSON object containing all users as key/value pairs
    return userData.data;
}

User.getAllView = () => {
    let arr = User.getAllIds();
    let obj = {};
    arr.forEach(id => {
        let uid = User.findById(id)
        obj[`${id}`] = User.makeView(uid);
        }
    )
}

User.getAllIdNamePairs = () => {
    // return an array of objects with fields userId and displayName as currently in storage
    let data = Object.keys(userData.data)
    let result = [];
    for (let user of data) {
        result.push({userId: `${user}`, displayName: `${userData.data[user].displayName}`})
    }
    return result;
}

User.delete = (id) => {
    // if user exists, deletes user and returns true, else returns false
    if(userData.get(id) != null) {
        userData.del(id);
        return true;
    }
    return false;
}

User.unlikeTweet = (userId, tweetId) => {
    let u = User.findById(userId);
    if (u == {}) {return;}
    if (u.likedTweets.includes(tweetId.toString())) {
        const index = u.likedTweets.indexOf(tweetId.toString());
        if (index > -1) {
            u.likedTweets.splice(index, 1);
        }
        userData.set(userId, u);
    }
}

User.likeTweet = (userId, tweetId) => {
    let u = User.findById(userId);
    if (u == {}) {return;}
    if (!u.likedTweets.includes(tweetId)) {
        u.likedTweets.push(tweetId);
        userData.set(userId, u);
    }
}

User.postTweet = (userId, tweetId) => {
    let u = User.findById(userId);
    if (u == {}) {return;}
    u.postedTweets.push(tweetId.toString());
    userData.set(userId, u);
}

User.deleteTweet = (userId, tweetId) => {
    let u = User.findById(userId);
    if (u == {}) {return;}
    if (u.postedTweets.includes(tweetId.toString())) {
        const index = u.postedTweets.indexOf(tweetId.toString());
        if (index > -1) {
            u.postedTweets.splice(index, 1);
        }
        userData.set(userId, u);
    }
}

module.exports = User;