import { mongoose, Schema } from "mongoose";

const publicSchema = new Schema(
  {
   employeeId: {
     type: Number,
     required: true,
     unique: true
   },
   author:[{
     type: Schema.Types.ObjectId,
     ref: "Author"
   }]
   ,
  },
  { timestamps: true }
);

export const Publication = mongoose.model("Publication", publicSchema);
