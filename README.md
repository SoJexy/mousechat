# mousechat
Hello friend. Welcome to mousechat. This is a web application to promote anonymous student/professor chat

# Installation
This requires any browser and node.js. Download node.js [here](https://nodejs.org/).

# Running
Run the server in cmd line using
```
node server.js
```

You can set your server IP and listening port in your server.js file. Just change the following line:

```javascript
app.configure(function () {
	app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 8080);
    app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
    ...
});
```