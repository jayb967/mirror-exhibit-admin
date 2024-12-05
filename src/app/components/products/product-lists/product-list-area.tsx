"use client";
import Link from "next/link";
import React, { useState } from "react";
import ProductTableHead from "./prd-table-head";
import ProductTableItem from "./prd-table-item";
import Pagination from "../../ui/Pagination";
import { Search } from "@/svg";
import ErrorMsg from "../../common/error-msg";
import Swal from "sweetalert2";
import { notifyError } from "@/utils/toast";
import { useDeleteProductMutation, useGetAllProductsQuery } from "@/redux/product/productApi";


type Product = {
  _id: string;
  title: string;
  status: string;
};

const ProductListArea = () => {
  const { data: products, isError, isLoading } = useGetAllProductsQuery();
  const [currPage, setCurrPage] = useState<number>(1);
  const [countOfPage, setCountOfPage] = useState<number>(8);
  const [searchValue, setSearchValue] = useState<string>("");
  const [selectValue, setSelectValue] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [deleteProduct] = useDeleteProductMutation();


  // search field
  const handleSearchProduct = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  // handle select input
  const handleSelectField = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectValue(e.target.value);
  };

  const toggleSelect = (id: string) => {
    setSelectedProducts((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all products
      const allProductIds = new Set(products.data.map((p: Product) => p._id));
      setSelectedProducts(allProductIds);
      setSelectAll(true);
    } else {
      // Deselect all products
      setSelectedProducts(new Set());
      setSelectAll(false);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedProducts);
    if (idsToDelete.length === 0) {
      alert("No products selected!");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: `Delete selected products?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete them!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const deletePromises = idsToDelete.map((id) => deleteProduct(id));
          const results = await Promise.all(deletePromises);

          const errors = results.filter((res) => "error" in res);
          if (errors.length) {
            errors.forEach((res: any) => {
              if (res.error && res.error.data?.message) {
                notifyError(res.error.data.message);
              }
            });
          }

          Swal.fire("Deleted!", "Selected products have been deleted.", "success");
          setSelectedProducts(new Set());
          setSelectAll(false);
        } catch (error) {
          console.error("Error during bulk deletion:", error);
          notifyError("Failed to delete selected products.");
        }
      }
    });
  };

  // decide what to render
  let content = null;

  if (isLoading) {
    content = <h2>Loading....</h2>;
  }
  if (!isLoading && isError) {
    content = <ErrorMsg msg="There was an error" />;
  }
  if (!isLoading && isError && products?.data.length === 0) {
    content = <ErrorMsg msg="No Products Found" />;
  }

  if (!isLoading && !isError && products?.success) {
    let productItems = [...products.data].reverse();
    const pageStart = (currPage - 1) * countOfPage;
    const pageEnd = pageStart + countOfPage;
    const displayedProducts = productItems.slice(pageStart, pageEnd);
    const totalPage = Math.ceil(productItems.length / countOfPage);

    // search field
    if (searchValue) {
      productItems = productItems.filter((p: Product) =>
        p.title.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    if (selectValue) {
      productItems = productItems.filter((p: Product) => p.status === selectValue);
    }

    content = (
      <>
        <div className="relative overflow-x-auto  mx-8">
          <table className="w-full text-base text-left text-gray-500">
            {/* table head start */}
            <ProductTableHead toggleSelectAll={toggleSelectAll} selectAll={selectAll} />

            {/* table head end */}
            <tbody>
              {displayedProducts.map((prd) => (
                <ProductTableItem
                  key={prd._id}
                  product={prd}
                  toggleSelect={toggleSelect}
                  selected={selectedProducts.has(prd._id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* bottom  */}
        {productItems.length > countOfPage && (
          <div className="flex justify-between items-center flex-wrap mx-8">
            <p className="mb-0 text-tiny">
              Showing {pageStart + 1}-{pageStart + displayedProducts.length} of{" "}
              {productItems.length}
            </p>
            <div className="pagination py-3 flex justify-end items-center mx-8">
              <Pagination
                currPage={currPage}
                totalPage={totalPage}
                setCurrPage={setCurrPage}
              />
            </div>
          </div>)
        }
      </>
    );
  }
  return (
    <>
      {/* table start */}
      <div className="bg-white rounded-t-md rounded-b-md shadow-xs py-4">
        <div className="tp-search-box flex items-center justify-between px-8 py-8">
          <div className="search-input relative">
            <input
              onChange={handleSearchProduct}
              className="input h-[44px] w-full pl-14"
              type="text"
              placeholder="Search by product name"
            />
            <button className="absolute top-1/2 left-5 translate-y-[-50%] hover:text-theme">
              <Search />
            </button>
          </div>
          <div className="flex justify-end space-x-6">
            <div className="search-select mr-3 flex items-center space-x-3 ">
              <span className="text-tiny inline-block leading-none -translate-y-[2px]">
                Status :{" "}
              </span>
              <select onChange={handleSelectField}>
                <option value="">Status</option>
                <option value="active">active</option>
                <option value="inActive">Not Active</option>
              </select>
            </div>
            <div className="product-add-btn flex ">
              <Link href="/add-product" className="tp-btn">
                Add Product
              </Link>
            </div>
          </div>
        </div>
        <div className="flex justify-between px-8 py-4">
        <button onClick={handleBulkDelete} className="tp-btn bg-red-500 text-white">
          Delete Selected
        </button>
      </div>
        {content}
      </div>
      {/* table end */}
    </>
  );
};

export default ProductListArea;
