const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function hashPasswords() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Ashimwe#001",
    database: "AX_STOCK_ALX_PROJECT1",
  });

  try {
    // Get all users with plain text passwords
    const [users] = await connection.execute(
      "SELECT id, name, password FROM user"
    );

    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2)
      if (user.password && !user.password.startsWith("$2")) {
        console.log(`Hashing password for user: ${user.name}`);
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await connection.execute("UPDATE user SET password = ? WHERE id = ?", [
          hashedPassword,
          user.id,
        ]);
        console.log(`Updated password for: ${user.name}`);
      } else {
        console.log(`Password for ${user.name} is already hashed or null`);
      }
    }

    console.log("Password hashing completed!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

hashPasswords();
