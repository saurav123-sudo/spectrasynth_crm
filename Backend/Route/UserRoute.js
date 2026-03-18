const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");
const checkPermission = require("../middlewares/checkPermission");
const auth = require("../middlewares/auth");
const uploadAvatar = require("../middlewares/uploadAvatar");

// Routes
router.post("/add-user",auth, userController.addUser);
router.post("/login",userController.loginUser);
router.get("/",auth, userController.getAllUsers);
router.get("/me", auth, userController.getMe);
router.get(
  "/:id",
  auth,
 
  userController.getUserById
);


router.post("/create-permissions/:user_id", userController.createPermissions);
router.get("/fetch-permissions/:user_id", userController.getUserPermissions);
router.get("/fetch/permissions",auth, userController.getPermissions);
router.put('/update-name',auth,userController.updateUserName)

router.post(
  "/upload-avatar",
  auth,
  uploadAvatar.single("avatar"),
  userController.uploadAvatar
);


router.delete(
  "/:id",
  auth,
 
  userController.deleteUser
);

router.put(
  "/editUser/:id",
  auth,
 
  userController.editUser
);


module.exports = router;
