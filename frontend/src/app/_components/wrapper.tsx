"use client";

interface WrapperProp {
  children: React.ReactNode;
}

const Wrapper = ({ children }: WrapperProp) => {
  return <div>{children}</div>;
};

export default Wrapper;
