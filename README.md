# to run in dev (3 bash windows)
(1) ./auth.sh  
(2) cd server then npm run dev
(3) cd client then npm run dev

# baseapp
To run specific test file:
yarn test src/xlxlxl/filename.test.js or (ts)

To debug current test file inside VS code, make sure you right the correct debug launch config (i.e. server vs client).

To debug functions using node, create a debug-xxx.ts file in the src folder and then create a launch config (like DEBUG BOT).  Then run that launch config.  Make sure you build after code changes because the debug is using the
.js output (I couldn't get ts-node to work :( )