const userData = require('data-store')({path: process.cwd() + './data/users.json'});

class User {
    constructor(id, displayName, password, avatar)
    {this.id = id;
    this.displayName = displayName;
    this.password = password;
    this.avatar = avatar;
    this.type = "user";
    };

    update() {
        userData.set(this.id.toString(), this);
    }
}

User.create = (id, displayName, password, avatar = "[default link]") => {
    let u = new User(id, displayName, password, avatar);
    userData.set(u.id.toString(), u);
    return u;
}

User.createAdmin = (id, displayName, password, avatar = "[default link]") => {
    let u = new User(id, displayName, password, avatar);
    u.type = "admin";
    userData.set(u.id.toString(), u);
    return u;
}

User.findById = (id) => {
    let u = userData.get(id);
    if (u != null) {
        return userData.get(id);
    }
    return null;
}

User.getAll = () => {
    // return an array of all user IDs
    return userData.data;
}

User.getAllIds = () => {
    // return an array of all user IDs
    return Object.keys(userData.data);
}

module.exports = User;