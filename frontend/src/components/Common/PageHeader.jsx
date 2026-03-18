import React from "react";

const PageHeader = ({ title, count, onRefresh, onCollapse }) => {
  return (
    <div className="row">
      <div className="col-md-12">
        <div className="page-header">
          <div className="row align-items-center">
            <div className="col-8">
              <h4 className="page-title">
                {title}
                {count !== undefined && (
                  <span className="count-title">{count}</span>
                )}
              </h4>
            </div>
            <div className="col-4 text-end">
              <div className="head-icons">
                <a
                  href="#!"
                  onClick={(e) => {
                    e.preventDefault();
                    onRefresh && onRefresh();
                  }}
                  data-bs-toggle="tooltip"
                  data-bs-placement="top"
                  data-bs-original-title="Refresh"
                >
                  <i className="ti ti-refresh-dot"></i>
                </a>
                <a
                  href="javascript:void(0);"
                  data-bs-toggle="tooltip"
                  data-bs-placement="top"
                  data-bs-original-title="Collapse"
                  id="collapse-header"
                  onClick={onCollapse}
                >
                  <i className="ti ti-chevrons-up"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;