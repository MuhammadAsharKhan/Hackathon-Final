import Modal from "./Modal";

/** A drawer is the modal panel anchored to the right edge. */
export default function Drawer({ className, ...props }) {
  return (
    <Modal variant="drawer" className={className} {...props} />
  );
}
