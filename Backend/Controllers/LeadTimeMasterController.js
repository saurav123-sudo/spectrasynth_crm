const LeadTimeMaster = require("../models/LeadTimeMaster");
const { Op } = require("sequelize");

/**
 * Get all lead time options
 * Optional filters: status, search
 */
exports.getAllLeadTimes = async (req, res) => {
  try {
    const { search } = req.query;
    
    let whereClause = {};
    
    // Search in lead_time
    if (search) {
      whereClause.lead_time = { [Op.like]: `%${search}%` };
    }
    
    const leadTimes = await LeadTimeMaster.findAll({
      where: whereClause,
      order: [['lead_time', 'ASC']],
    });
    
    res.status(200).json({
      success: true,
      count: leadTimes.length,
      data: leadTimes,
    });
  } catch (error) {
    console.error("Error fetching lead times:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lead times",
      error: error.message,
    });
  }
};

/**
 * Get all lead time options (for dropdowns)
 */
exports.getActiveLeadTimes = async (req, res) => {
  try {
    const leadTimes = await LeadTimeMaster.findAll({
      order: [['lead_time', 'ASC']],
      attributes: ['id', 'lead_time'],
    });
    
    res.status(200).json({
      success: true,
      count: leadTimes.length,
      data: leadTimes,
    });
  } catch (error) {
    console.error("Error fetching lead times:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lead times",
      error: error.message,
    });
  }
};

/**
 * Get single lead time by ID
 */
exports.getLeadTimeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const leadTime = await LeadTimeMaster.findByPk(id);
    
    if (!leadTime) {
      return res.status(404).json({
        success: false,
        message: "Lead time not found",
      });
    }
    
    res.status(200).json({
      success: true,
      data: leadTime,
    });
  } catch (error) {
    console.error("Error fetching lead time:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lead time",
      error: error.message,
    });
  }
};

/**
 * Create new lead time
 */
exports.createLeadTime = async (req, res) => {
  try {
    const {
      lead_time,
      created_by,
    } = req.body;
    
    // Validation
    if (!lead_time) {
      return res.status(400).json({
        success: false,
        message: "Lead time is required",
      });
    }
    
    // Check if lead_time already exists
    const existingLeadTime = await LeadTimeMaster.findOne({
      where: { lead_time },
    });
    
    if (existingLeadTime) {
      return res.status(409).json({
        success: false,
        message: "Lead time already exists",
      });
    }
    
    // Create new lead time
    const newLeadTime = await LeadTimeMaster.create({
      lead_time,
      created_by: created_by || req.user?.name || 'Admin',
    });
    
    res.status(201).json({
      success: true,
      message: "Lead time created successfully",
      data: newLeadTime,
    });
  } catch (error) {
    console.error("Error creating lead time:", error);
    res.status(500).json({
      success: false,
      message: "Error creating lead time",
      error: error.message,
    });
  }
};

/**
 * Update lead time
 */
exports.updateLeadTime = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lead_time,
    } = req.body;
    
    const leadTime = await LeadTimeMaster.findByPk(id);
    
    if (!leadTime) {
      return res.status(404).json({
        success: false,
        message: "Lead time not found",
      });
    }
    
    // Check if new lead_time already exists (excluding current record)
    if (lead_time && lead_time !== leadTime.lead_time) {
      const existingLeadTime = await LeadTimeMaster.findOne({
        where: {
          lead_time,
          id: { [Op.ne]: id },
        },
      });
      
      if (existingLeadTime) {
        return res.status(409).json({
          success: false,
          message: "Lead time already exists",
        });
      }
    }
    
    // Update field
    if (lead_time) leadTime.lead_time = lead_time;
    leadTime.updated_by = req.user?.name || 'Admin';
    
    await leadTime.save();
    
    res.status(200).json({
      success: true,
      message: "Lead time updated successfully",
      data: leadTime,
    });
  } catch (error) {
    console.error("Error updating lead time:", error);
    res.status(500).json({
      success: false,
      message: "Error updating lead time",
      error: error.message,
    });
  }
};

/**
 * Delete lead time (hard delete)
 */
exports.deleteLeadTime = async (req, res) => {
  try {
    const { id } = req.params;
    
    const leadTime = await LeadTimeMaster.findByPk(id);
    
    if (!leadTime) {
      return res.status(404).json({
        success: false,
        message: "Lead time not found",
      });
    }
    
    await leadTime.destroy();
    
    res.status(200).json({
      success: true,
      message: "Lead time deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting lead time:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting lead time",
      error: error.message,
    });
  }
};

/**
 * Permanently delete lead time (hard delete)
 * Use with caution!
 */
exports.permanentDeleteLeadTime = async (req, res) => {
  try {
    const { id } = req.params;
    
    const leadTime = await LeadTimeMaster.findByPk(id);
    
    if (!leadTime) {
      return res.status(404).json({
        success: false,
        message: "Lead time not found",
      });
    }
    
    await leadTime.destroy();
    
    res.status(200).json({
      success: true,
      message: "Lead time permanently deleted",
    });
  } catch (error) {
    console.error("Error permanently deleting lead time:", error);
    res.status(500).json({
      success: false,
      message: "Error permanently deleting lead time",
      error: error.message,
    });
  }
};


module.exports = exports;


