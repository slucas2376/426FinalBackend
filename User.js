const userData = require('data-store')({path: process.cwd() + '/data/users.json'});

class User {
    constructor(id, displayName, password, avatar, type = "user")
    {this.id = id;
    this.displayName = displayName;
    this.password = password;
    this.avatar = avatar;
    this.type = type;
    };
}

User.create = (id, displayName, password, avatar = "[default link]") => {
    let u = new User(id, displayName, password, avatar);
    userData.set(u.id.toString(), u);
    return u;
}

User.createAdmin = (id, displayName, password, avatar = "[default link]") => {
    let u = new User(id, displayName, password, avatar, "admin");
    u.type = "admin";
    userData.set(u.id.toString(), u);
    return u;
}

User.update = (id, displayName, password, avatar) => {
    let old = User.findById(id);
    if (old.type == "admin") {
        let a = new User(id, displayName, password, avatar, "admin")
        userData.set(id, a);
    } else {
        let u = new User(id, displayName, password, avatar)
        userData.set(id, u);
    };
}

User.makeView = (userObj) => {
    // generates a UserView object, which is just a User object without the password field
    let viewId = userObj.id;
    let viewDisplayName = userObj.displayName;
    let viewAvatar = userObj.avatar;
    let viewType = userObj.type;
    return {id: viewId, displayName: viewDisplayName, avatar: viewAvatar, type: viewType}
}

User.findById = (id) => {
    // returns user object for given id; if id is undefined, returns empty object;
    if (id == undefined) {
        return {};
    }
    let u = userData.data[id];
    if (u == undefined) {
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

User.getAllIds = () => {
    // return an array of all user IDs
    return Object.keys(userData.data);
}

User.delete = (id) => {
    // if user exists, deletes user and returns true, else returns false
    if(userData.get(id) != null) {
        userData.del(id);
        return true;
    }
    return false;
}

module.exports = User;