import jwt from "jsonwebtoken";

const authDoctor = (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = req.headers.dtoken || req.headers.dToken || req.headers["dtoken"];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ correct way
    req.docId = decoded.id;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export default authDoctor;




