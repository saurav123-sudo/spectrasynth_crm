const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const UserRole = require("../models/UserRole");
const Permission = require("../models/Permission");

exports.addUser = async (req, res) => {
  try {
    const { name, email, password, roles } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashedPassword });

    if (roles && Array.isArray(roles)) {
      const roleRecords = roles.map((role) => ({ role, user_id: user.id }));
      await UserRole.bulkCreate(roleRecords);
    }

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: roles || [],
      },
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Fetch user along with roles
    const user = await User.findOne({
      where: { email },
      include: [{ model: UserRole, as: "roles" }],
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Extract roles as an array of role strings
    const roles = user.roles.map((r) => r.role);

    // Include id, name, and roles in the token
    const token = jwt.sign(
      { id: user.id, name: user.name, roles,email: user.email, },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: UserRole, as: "roles", attributes: ["role"] }],
    });

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateUserName = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Name is too short" });
    }

    // Fetch user WITH roles
    const user = await User.findByPk(userId, {
      include: [{ model: UserRole, as: "roles" }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name.trim();
    await user.save();

    // Extract roles as array of strings
    const roles = user.roles.map((r) => r.role);

    // 🔥 Re-sign token with SAME SHAPE as login
    const newToken = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: roles,  
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Name updated",
      token: newToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: roles, 
      },
    });
  } catch (err) {
    console.error("Update name error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createPermissions = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { permissions } = req.body;

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({ message: "Permissions array is required" });
    }

    const validModules = [
      "inquiry",
      "technical_person",
      "marketing_person",
      "product",
      "company_price",
      "quotation",
      "users",
      "purchase_order",
      "reminder_history",
      "reminder_followup",
    ];

    const filteredPermissions = permissions.filter((p) =>
      validModules.includes(p.module_name),
    );

    if (filteredPermissions.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid module permissions provided" });
    }

    const permissionData = filteredPermissions.map((p) => ({
      user_id,
      module_name: p.module_name,
      can_create: p.can_create || false,
      can_read: p.can_read !== undefined ? p.can_read : true,
      can_update: p.can_update || false,
      can_delete: p.can_delete || false,
    }));

    await Permission.bulkCreate(permissionData, {
      updateOnDuplicate: ["can_create", "can_read", "can_update", "can_delete"],
    });

    const moduleNames = permissionData.map((p) => p.module_name);
    const createdOrUpdatedPermissions = await Permission.findAll({
      where: { user_id, module_name: moduleNames },
    });

    res.status(201).json({
      message: "Permissions created/updated successfully",
      permissions: createdOrUpdatedPermissions,
    });
  } catch (error) {
    console.error("Error creating/updating permissions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserPermissions = async (req, res) => {
  try {
    const { user_id } = req.params;
    // console.log("Fetching permissions for user_id:", user_id);

    const user = await User.findByPk(user_id, {
      attributes: ["id", "name", "email"],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const permissions = await Permission.findAll({
      where: { user_id },
      attributes: [
        "id",
        "module_name",
        "can_create",
        "can_read",
        "can_update",
        "can_delete",
      ],
    });

    res.json({
      user,
      permissions,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getPermissions = async (req, res) => {
  try {
    const user_id = req.user.id;

    const user = await User.findByPk(user_id, {
      attributes: ["id"],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const permissions = await Permission.findAll({
      where: { user_id },
      attributes: [
        "id",
        "module_name",
        "can_create",
        "can_read",
        "can_update",
        "can_delete",
      ],
    });

    res.json({
      user,
      permissions,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, roles } = req.body;

    // Find the user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is changed and already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }
    }

    // Hash password if provided
    let hashedPassword = user.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update user
    await user.update({ name, email, password: hashedPassword });

    // Update roles
    if (roles && Array.isArray(roles)) {
      // Delete old roles
      await UserRole.destroy({ where: { user_id: id } });

      // Add new roles
      const roleRecords = roles.map((role) => ({ role, user_id: id }));
      await UserRole.bulkCreate(roleRecords);
    }

    res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: roles || [],
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: { id },
      attributes: ["id", "name", "email"],
      include: [
        {
          model: UserRole,
          as: "roles",
          attributes: ["role"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



exports.uploadAvatar = async (req, res) => {
  try {
    // req.user should come from auth middleware
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // File path saved by multer
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    // Update user avatar in DB
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.avatar = avatarPath;
    await user.save();

    return res.status(200).json({
      message: "Avatar updated successfully",
      avatar: avatarPath,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return res.status(500).json({
      message: "Failed to upload avatar",
      error: error.message,
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "avatar"], // add more if needed
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("GetMe error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
