import Wrapper from "@/layout/wrapper";
import Breadcrumb from "../components/breadcrumb/breadcrumb";
import BulkProductSubmit from "../components/products/bulk-add-product/bulk-product-submit";

const BulkAddProduct = () => {
  return (
    <Wrapper>
      <div className="body-content px-8 py-8 bg-slate-100">
        {/* breadcrumb start */}
        <Breadcrumb title="Bulk Upload Products" subtitle="Upload Products" />
        {/* breadcrumb end */}

        {/* bulk add products start */}
        <div className="grid grid-cols-12">
          <div className="col-span-12 2xl:col-span-10">
            <BulkProductSubmit />
          </div>
        </div>
        {/* bulk add products end */}
      </div>
    </Wrapper>
  );
};

export default BulkAddProduct;
