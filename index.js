require("dotenv").config();
const app = require("./app");

const port = process.env.PORT || 3000;

app.listen(port, (err) => {
    if (err) {
        console.error("Error while starting the server:", err);
    } else {
        console.log("Server on port:", port);
    }
});
