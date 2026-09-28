import mysql from "mysql2/promise";
const c = await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',database:'aasw'});
const [rows] = await c.query('SHOW TABLES');
console.log('TABLES:', rows.length);
console.log(rows.map(r=>Object.values(r)[0]).join(', '));
await c.end();
