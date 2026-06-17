import { env } from "./config/env";
import { app } from "./app";

const startServer = () => {
  try {
    app.listen(env.PORT, () => {
      console.log(`Server is running on port ${env.PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};

startServer();
