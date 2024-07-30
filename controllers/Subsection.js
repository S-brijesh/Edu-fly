const SubSection = require("../models/SubSection");
const Section = require("../models/Section");
const {uploadImageToCloudinary} = require("../utils/imageUploader");


// create Subsection
exports.createSubSection = async(req,res)=>{
    try{
        // fetch the data
        const {sectionId, title, description,timeDuration} = req.body;
        // extract file/video
        const video = req.files.videoFile;
        //validation
        if(!sectionId || !title || !description || !timeDuration || !video){
            return res.status(400).json({
                success:false,
                message:'All fields are required, Please fill the details carefully'
            });
        }

        // upload video to cloud
        const uploadDetails = await uploadImageToCloudinary(video,process.env.FOLDER_NAME);
        // create a sub-section
        const subSectionDetails = await SubSection.create({
            title:title,
            timeDuration:timeDuration,
            description:description,
            videoUrl:uploadDetails.secure_url
        });
        //update section with this section objectId
        const updatedSection = await Section.findByIdAndUpdate({_id:sectionId},
                                                        {
                                                            $push:{SubSection:subSectionDetails._id},
                                                        },
        ///  log updated section here after adding populate query
                                                        {new:true}).populate("subSection");;
        //return response
        return res.status(200).json({
            success:true,
            message:'Successfully created sub section',
            updatedSection
        })

    }catch(error){
        return res.status(500).json({
            success:false,
            message:"Error in creating section",
            error:error.message
        });
    }
}
// -----> check below both functions 
//update subsection
exports.updateSubsection = async(req,res)=>{
    try{
        //data input
        const {subSectionName,subSectionId} = req.body;
        // data validation
        if(!subSectionName || !subSectionId){
            return res.status(400).json({
                success:false,
                message:'Missing Properties'
            });
        }

        // update data
        const subSection = await SubSection.findByIdAndUpdate(subSectionId,{subSectionName},{new:true});
        return res.status(200).json({
            success:true,
            message:'Sub-Section updated successfully'
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to update subSection, please try again later',
            error:error.message
        })
    }
}
//delete subsection
exports.deleteSubsection = async(req,res)=>{
    try{
        // get ID -> assuming that we will get id in params
        const {subSectionId} = req.params;

        await SubSection.findByIdAndDelete(subSectionId);
        return res.status(200).json({
            success:true,
            message:"Successfully deleted the Sub-section"
        })

    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to delete SubSection, please try again later',
            error:error.message
        })
    }
}