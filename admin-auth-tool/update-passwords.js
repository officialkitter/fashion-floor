import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from the secure .env file
dotenv.config();

const supabaseUrl = process.env.PROJECT_URL;
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Missing environment variables in .env file.");
  process.exit(1);
}

// Initialize the client with the Service Role Key to get admin privileges
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Target user data mapping UUIDs to complex, permanent passwords.
// Ensure your passwords contain lowercase, uppercase, numbers, and symbols (e.g., !, @, #, $, _).
const usersToUpdate = [
  {
    id: "67ef0481-59e5-4730-bbff-0ae1416ec543",
    newPassword: "YourSecurePassword123!One"
  },
  {
    id: "30e42e43-bfe3-4796-ba65-183628dc3c82",
    newPassword: "YourSecurePassword123!Two"
  }
];

async function updateUserPasswords() {
  console.log("🚀 Starting administrative password updates...");

  for (const user of usersToUpdate) {
    // updateUserById bypasses normal user-level verification requirements
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: user.newPassword }
    );

    if (error) {
      console.error(`❌ Failed to update user ${user.id}:`, error.message);
    } else {
      console.log(`✅ Successfully updated password for user ID: ${data.user.id}`);
    }
  }
}

updateUserPasswords();
