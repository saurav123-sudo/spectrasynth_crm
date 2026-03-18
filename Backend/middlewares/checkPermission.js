// middlewares/checkPermission.js
const Permission = require("../models/Permission");

const checkPermission = (moduleName, action) => {
  return async (req, res, next) => {
    try {
      const user_id = req.user.id; 

     
      const permission = await Permission.findOne({
        where: { user_id, module_name: moduleName }
      });

      if (!permission) {
        return res.status(403).json({ message: "No permission assigned for this module" });
      }

      if (!permission[`can_${action}`]) {
        return res.status(403).json({ message: `User not allowed to ${action} ${moduleName}` });
      }
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
};

module.exports = checkPermission;
