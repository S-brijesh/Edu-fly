const Section = require("../models/Section")
const Course = require("../models/Course");

exports.createSection = async(req,res)=>{
    try{
        //fetch data
        const {sectionName,courseId}= req.body;
        //data validation
        if(!sectionName || !courseId){
            return res.status(400).json({
                success:false,
                message:'Missing properties'
            });
        }
        //create section
        const newSection = await Section.create({sectionName});
        // update course with section objectId
        const updatedCourseDetails = await Course.findByIdAndUpdate(
                                            courseId,
                                            {
                                                $push:{
                                                    courseContent:newSection._id,   
                                                }
                                            },
                                            {new:true}
       // use populate to replace section/subsection both in updatedCourseDetails
        ).populate({
            path: "courseContent",
            populate: {
                path: "subSection",
            },
        })
        .exec();

        //return response
        return res.status(200).json({
            success:true,
            message:'Section created successfully',
            updatedCourseDetails
        });

    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to create section, Please try again',
            error:error.message
        });
    }
}

// update section
exports.updateSection = async(req,res)=>{
    try{
        //data input
        const {sectionName,sectionId} = req.body;
        // data validation
        if(!sectionName || !sectionId){
            return res.status(400).json({
                success:false,
                message:'Missing Properties'
            });
        }

        // update data
        const section = await Section.findByIdAndUpdate(sectionId,{sectionName},{new:true});
        return res.status(200).json({
            success:true,
            message:'Section updated successfully'
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to update Section, please try again later',
            error:error.message
        })
    }
}

// delete section
exports.deleteSection = async(req,res)=>{
    try{
        // get ID -> assuming that we will get id in params
        const {sectionId} = req.params;

        await Section.findByIdAndDelete(sectionId);
        return res.status(200).json({
            success:true,
            message:"Successfully deleted the section"
        })

    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to delete Section, please try again later',
            error:error.message
        })
    }
}

