import fs from "fs";

const deleteLocalFiles = (paths = []) => {
  paths.forEach((path) => {
    if (path && fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  });
};

export { deleteLocalFiles };
